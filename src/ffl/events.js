// SPDX-License-Identifier: Apache-2.0
//
// FastFileLink JavaScript binding - Fast, no-fuss file sharing
// Copyright (C) 2025-2026 FastFileLink contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { createServer } from 'node:http';

const SEMANTIC_EVENT_NAMES = new Map([
  ['/hook/server/endpoints/register', 'ready'],
  ['/hook/transfer/progress', 'progress'],
  ['/hook/transfer/transport', 'transport'],
  ['/hook/transfer/complete', 'completed'],
]);

export class FFLHookEvent {
  constructor(raw) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new TypeError('FFL hook payload must be a JSON object');
    }

    if (typeof raw.event !== 'string' || raw.event.length === 0) {
      throw new TypeError('FFL hook payload must include an event name');
    }

    if (raw.data !== undefined && (
      raw.data === null || typeof raw.data !== 'object' || Array.isArray(raw.data)
    )) {
      throw new TypeError('FFL hook payload data must be an object');
    }

    this.name = raw.event;
    this.semanticName = SEMANTIC_EVENT_NAMES.get(raw.event) ?? null;
    this.timestamp = typeof raw.timestamp === 'string' ? raw.timestamp : null;
    this.data = raw.data ?? {};
    this.raw = raw;
    Object.freeze(this);
  }
}

export class FFLHookEventChannel {
  static async create(forwardUrl = null, eventHistoryLimit = 1000) {
    const channel = new FFLHookEventChannel(forwardUrl, eventHistoryLimit);
    await channel._listen();
    return channel;
  }

  constructor(forwardUrl, eventHistoryLimit) {
    if (!Number.isSafeInteger(eventHistoryLimit) || eventHistoryLimit < 1) {
      throw new TypeError('eventHistoryLimit must be a positive integer');
    }

    this._forwardUrl = forwardUrl;
    this._eventHistoryLimit = eventHistoryLimit;
    this._history = [];
    this._listeners = new Map();
    this._semanticListeners = new Map();
    this._iterators = new Set();
    this._closed = false;
    this._error = null;
    this._server = createServer((request, response) => {
      this._handle(request, response);
    });
  }

  get url() {
    const address = this._server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('FFL hook server is not listening');
    }

    return `http://127.0.0.1:${address.port}`;
  }

  get history() {
    return this._history.map(({ event }) => event);
  }

  on(name, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('FFL event listener must be a function');
    }

    const listeners = this._listeners.get(name) ?? [];
    listeners.push(listener);
    this._listeners.set(name, listeners);

    for (const { event } of this._history) {
      if (event.name === name) {
        this._callListener(listener, event);
      }
    }

    this.raiseIfError();
  }

  onSemantic(name, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('FFL event listener must be a function');
    }

    const listeners = this._semanticListeners.get(name) ?? [];
    listeners.push(listener);
    this._semanticListeners.set(name, listeners);

    for (const { event } of this._history) {
      if (event.semanticName === name) {
        this._callListener(listener, event);
      }
    }

    this.raiseIfError();
  }

  async *events() {
    const iterator = {
      events: this._history.map(({ event }) => event),
      notify: null,
    };
    this._iterators.add(iterator);

    try {
      while (true) {
        const event = iterator.events.shift();
        if (event !== undefined) {
          yield event;
          continue;
        }

        if (this._closed) {
          return;
        }

        await new Promise((resolve) => {
          iterator.notify = resolve;
        });
        iterator.notify = null;
      }
    } finally {
      this._iterators.delete(iterator);
    }
  }

  raiseIfError() {
    if (this._error !== null) {
      throw this._error;
    }
  }

  async close() {
    if (this._closed) {
      return;
    }

    this._closed = true;
    this._notify();

    await new Promise((resolve, reject) => {
      this._server.close((error) => error === undefined ? resolve() : reject(error));
    });
  }

  _listen() {
    return new Promise((resolve, reject) => {
      this._server.once('error', reject);
      this._server.listen(0, '127.0.0.1', () => {
        this._server.off('error', reject);
        this._server.unref();
        resolve();
      });
    });
  }

  async _handle(request, response) {
    try {
      const chunks = [];
      for await (const chunk of request) {
        chunks.push(chunk);
      }

      const body = Buffer.concat(chunks).toString('utf8');
      const event = new FFLHookEvent(JSON.parse(body));
      const listenerCalls = this._publish(event, { deferListeners: true });

      response.writeHead(204);
      response.end();

      this._dispatchListeners(listenerCalls);
      this._forward(request.method, body);
      return;
    } catch (error) {
      this._error ??= error;
      response.writeHead(500);
    }

    response.end();
  }

  async _forward(method, body) {
    if (this._forwardUrl === null) {
      return;
    }

    try {
      await fetch(this._forwardUrl, {
        method,
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // A third-party endpoint must not make the local FFL transfer fail.
    }
  }

  _publish(event, { deferListeners = false } = {}) {
    this._history.push({ event });
    if (this._history.length > this._eventHistoryLimit) {
      this._history.shift();
    }

    const listenerCalls = [];

    for (const listener of this._listeners.get(event.name) ?? []) {
      listenerCalls.push([listener, event]);
    }

    if (event.semanticName !== null) {
      for (const listener of this._semanticListeners.get(event.semanticName) ?? []) {
        listenerCalls.push([listener, event]);
      }
    }

    for (const iterator of this._iterators) {
      iterator.events.push(event);
      iterator.notify?.();
    }

    if (deferListeners) {
      return listenerCalls;
    }

    for (const [listener, listenerEvent] of listenerCalls) {
      this._callListener(listener, listenerEvent);
    }

    return [];
  }

  _dispatchListeners(listenerCalls) {
    if (listenerCalls.length === 0) {
      return;
    }

    setImmediate(() => {
      for (const [listener, event] of listenerCalls) {
        this._callListener(listener, event);
      }
    });
  }

  _callListener(listener, event) {
    try {
      listener(event);
    } catch (error) {
      this._error ??= error;
    }
  }

  _notify() {
    for (const iterator of this._iterators) {
      iterator.notify?.();
    }
  }
}
