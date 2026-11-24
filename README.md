[![make.fun](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/faris-ecohomes/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/faris-ecohomes/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

# tiny-stack-vm

A small interpreter for make.fun's tiny stack ISA (version 1), written as a
single dependency-free `main.ts` for Node 22.

For every instance in the input directory it runs `program.bin` against
`input.bin` on a machine with wrapping 32-bit integers, a 256-value data
stack, a 64-address call stack and 256 words of memory, then writes the
program's bytes to `stdout.bin` and its exit code to `exit.txt` — trap codes
included, exactly as the ISA specifies: stack underflow/overflow, division by
zero, unknown opcodes, bad memory addresses, call/return errors, a program
counter outside the program, and the step and output limits.

Run it with `node main.ts`; it reads `/input` and writes `/output`, or the
directories named by `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR`.
