# Binding source

`ffl.apebind.yaml` is the reviewed semantic contract used to regenerate the low-level
Node.js binding. `ffl.commands.yaml` contains explicit hidden-command discovery seeds
for commands that FFL's root help does not enumerate.

`ffl.discovered.apebind.yaml` is discovery evidence only. FFL-specific behavior belongs
in the semantic schema or the handwritten `src/ffl` layer, never in APEBind's generic
help parser or Node backend.

## Update workflow

```bash
python scripts/inspect.py --ape /path/to/ffl.com
```

Review the raw discovery diff, merge intentional CLI changes into
`ffl.apebind.yaml`, then regenerate:

```bash
python scripts/regenerate.py --ape /path/to/ffl.com
```
