// tiny-stack-vm: an interpreter for make.fun's tiny stack ISA, version 1.
// Answers every instance in the input directory (stdout.bin + exit.txt).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IN_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const STACK_MAX = 256, CALL_MAX = 64, MEM_WORDS = 256;
const STEP_MAX = 1_000_000, OUT_MAX = 65_536;

// Per opcode byte: [immediate bytes, popped, pushed]; no row = trap 5.
const OPS = [];
for (const [b, i, p, q] of [
  [0x00,0,0,0],[0x01,1,0,1],[0x02,4,0,1],[0x03,0,1,0],[0x04,0,1,2],
  [0x05,0,2,2],[0x06,0,2,3],[0x07,0,3,3],[0x10,0,2,1],[0x11,0,2,1],
  [0x12,0,2,1],[0x13,0,2,1],[0x14,0,2,1],[0x15,0,2,1],[0x16,0,2,1],
  [0x17,0,1,1],[0x18,0,2,1],[0x19,0,2,1],[0x1a,0,2,1],[0x1b,0,1,1],
  [0x1c,0,2,1],[0x1d,0,2,1],[0x1e,0,2,1],[0x20,0,2,1],[0x21,0,2,1],
  [0x22,0,2,1],[0x30,2,0,0],[0x31,2,1,0],[0x32,2,1,0],[0x33,2,0,0],
  [0x34,0,0,0],[0x40,0,1,1],[0x41,0,2,0],[0x50,0,1,0],[0x51,0,1,0],
  [0x52,0,0,1],[0x53,0,1,0],
]) OPS[b] = [i, p, q];

// Runs one program to its end; returns its bytes and end code.
function run(prog, input) {
  const st = new Int32Array(STACK_MAX), cs = new Int32Array(CALL_MAX);
  const mem = new Int32Array(MEM_WORDS), out = new Uint8Array(OUT_MAX);
  const n = prog.length;
  let sp = 0, csp = 0, len = 0, rd = 0, pc = 0, steps = 0;
  const end = (code) => ({ out: out.subarray(0, len), code });
  for (;;) {
    if (steps === STEP_MAX) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = prog[pc], facts = OPS[op];
    if (facts === undefined) return end(5);
    const [imm, pops, pushes] = facts;
    if (pc + imm >= n) return end(9);
    steps++;
    if (sp < pops) return end(2);
    if (sp - pops + pushes > STACK_MAX) return end(3);
    const next = pc + 1 + imm;
    pc = next;
    switch (op) {
      case 0x00: return end(0);
      case 0x01: st[sp++] = (prog[next - 1] << 24) >> 24; break; // PUSH8
      case 0x02: // PUSH32
        st[sp++] = prog[next - 4] | (prog[next - 3] << 8) |
          (prog[next - 2] << 16) | (prog[next - 1] << 24);
        break;
      case 0x03: sp--; break;
      case 0x04: st[sp] = st[sp - 1]; sp++; break;
      case 0x05: { // SWAP
        const t = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = t;
        break;
      }
      case 0x06: st[sp] = st[sp - 2]; sp++; break;
      case 0x07: { // ROT: ( a b c -- b c a )
        const a = st[sp - 3];
        st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = a;
        break;
      }
      case 0x17: st[sp - 1] = -st[sp - 1] | 0; break; // NEG
      case 0x1b: st[sp - 1] = ~st[sp - 1]; break; // NOT
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14:
      case 0x15: case 0x16: case 0x18: case 0x19: case 0x1a:
      case 0x1c: case 0x1d: case 0x1e: case 0x20: case 0x21:
      case 0x22: { // binary: ( a b -- r )
        const b = st[sp - 1], a = st[sp - 2];
        let r;
        if (op === 0x10) r = (a + b) | 0;
        else if (op === 0x11) r = (a - b) | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) { // DIV, truncated toward zero
          if (b === 0) return end(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 0x14) { // MOD, sign of a
          if (b === 0) return end(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 0x15) { // DIVU
          if (b === 0) return end(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 0x16) { // MODU
          if (b === 0) return end(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        }
        else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // LTU
        sp--;
        st[sp - 1] = r;
        break;
      }
      case 0x30: case 0x31: case 0x32: { // jumps
        const off = ((prog[next - 2] | (prog[next - 1] << 8)) << 16) >> 16;
        let go = op === 0x30;
        if (!go) {
          const v = st[--sp];
          go = op === 0x31 ? v === 0 : v !== 0;
        }
        if (go) pc = next + off;
        break;
      }
      case 0x33:
        if (csp === CALL_MAX) return end(7);
        cs[csp++] = next;
        pc = prog[next - 2] | (prog[next - 1] << 8);
        break;
      case 0x34:
        if (csp === 0) return end(8);
        pc = cs[--csp];
        break;
      case 0x40: { // LOAD
        const addr = st[sp - 1];
        if (addr < 0 || addr >= MEM_WORDS) return end(6);
        st[sp - 1] = mem[addr];
        break;
      }
      case 0x41: { // STORE
        const addr = st[sp - 1];
        if (addr < 0 || addr >= MEM_WORDS) return end(6);
        mem[addr] = st[sp - 2];
        sp -= 2;
        break;
      }
      case 0x50: { // PRINT, all bytes or none
        const text = String(st[sp - 1]);
        if (len + text.length > OUT_MAX) return end(11);
        sp--;
        for (let i = 0; i < text.length; i++) out[len++] = text.charCodeAt(i);
        break;
      }
      case 0x51:
        if (len + 1 > OUT_MAX) return end(11);
        out[len++] = st[--sp] & 255;
        break;
      case 0x52:
        st[sp++] = rd < input.length ? input[rd++] : -1;
        break;
      case 0x53: return end(st[--sp] & 255);
    }
  }
}

for (const id of readdirSync(IN_DIR).sort()) {
  let prog, input;
  try { prog = readFileSync(join(IN_DIR, id, 'program.bin')); }
  catch { prog = Buffer.alloc(0); }
  try { input = readFileSync(join(IN_DIR, id, 'input.bin')); }
  catch { input = Buffer.alloc(0); }
  const { out, code } = run(prog, input);
  mkdirSync(join(OUT_DIR, id), { recursive: true });
  writeFileSync(join(OUT_DIR, id, 'stdout.bin'), out);
  writeFileSync(join(OUT_DIR, id, 'exit.txt'), code + '\n');
}
