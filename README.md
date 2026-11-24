[![make.fun](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/faris-ecohomes/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/faris-ecohomes/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

# tiny-stack-vm

A small interpreter for make.fun's tiny stack ISA (version 1), in one
dependency-free `main.ts` for Node 22. Each instance's `program.bin` runs
against its `input.bin` — wrapping 32-bit integers, a 256-value stack, a
64-address call stack, 256 words of memory, the step and output limits,
every trap with its own exit code — and yields `stdout.bin` and `exit.txt`.
