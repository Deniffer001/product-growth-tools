# gkit evals

`tasks.jsonl` is the executable answer-key set for the first vertical slices.
Each line is one independent prompt with:

- `kind`: explicit provider, business goal, or negative request.
- `answer`: the intended provider, capability, effects, command sequence, and
  observable process behavior.
- `legacy`: the current workflow disposition. `replace` requires behavioral
  evidence before retirement; `keep` means the current CLI remains available;
  `drop` means the sole consumer explicitly rejects that surface.
- `slice1`: whether the task must work in the first DataForSEO vertical slice.

## Manual evaluation

1. Start a fresh agent session with only `gkit --schema`, `gkit docs`, and the
   prompt.
2. Record discovery steps before the first executable command.
3. Compare the selected provider, capability ID, effects, command, exit code,
   stdout envelope, stderr, and artifact behavior with the answer key.
4. A future-slice task is not a Slice 1 failure. Slice 1 requires the two
   `executable` tasks and both negative tasks to match their keys.
5. Never execute a paid command during evaluation unless the profile cap,
   invocation cap, and explicit spend acknowledgement are all present.

The initial targets are:

- provider top-1 accuracy: 100% for explicit-provider prompts;
- discovery: at most two steps before `describe` or execution;
- first executable command: correct for both Slice 1 executable tasks;
- negative precision: 100%, with zero provider network calls.
