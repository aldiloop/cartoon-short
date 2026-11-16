# Remotion's Rust compositor binary asks for hypot@GLIBC_2.35, the only symbol newer than this sandbox's glibc 2.34
# (Amazon Linux 2023). hypot@GLIBC_2.2.5 has the same behaviour, so this rewrites that one version reference to
# GLIBC_2.2.5 in node_modules (local only; idempotent; the original is kept as remotion.orig). Standard library only.
# On a machine with glibc >= 2.35 it does nothing.
import os, platform, shutil, struct, sys

def glibc():
    v = platform.libc_ver()[1] or "0.0"
    return tuple(int(x) for x in v.split(".")[:2])

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    p = os.path.join(here, "..", "node_modules", "@remotion", "compositor-linux-x64-gnu", "remotion")
    if not os.path.exists(p) or glibc() >= (2, 35):
        print("patch_compositor: nothing to do"); return
    data = bytearray(open(p, "rb").read())
    if data[:4] != b"\x7fELF" or data[4] != 2:
        sys.exit("patch_compositor: not an ELF64 file")
    e_shoff, = struct.unpack_from("<Q", data, 0x28)
    e_shentsize, e_shnum, e_shstrndx = struct.unpack_from("<HHH", data, 0x3A)
    secs = []
    for i in range(e_shnum):
        o = e_shoff + i * e_shentsize
        name, typ, flags, addr, off, size, link, info = struct.unpack_from("<IIQQQQII", data, o)
        secs.append((name, typ, off, size, link, info))
    shstr = secs[e_shstrndx]
    nm = lambda n: data[shstr[2] + n:data.index(b"\0", shstr[2] + n)].decode()
    vr = next(s for s in secs if nm(s[0]) == ".gnu.version_r")
    dynstr = secs[vr[4]]
    S = bytes(data[dynstr[2]:dynstr[2] + dynstr[3]])
    target = S.index(b"GLIBC_2.2.5\0")
    pos, done = vr[2], 0
    for _ in range(vr[5]):
        _, cnt, _, aux, nxt = struct.unpack_from("<HHIII", data, pos)
        a = pos + aux
        for _ in range(cnt):
            h, fl, other, name, anext = struct.unpack_from("<IHHII", data, a)
            if S[name:S.index(b"\0", name)] == b"GLIBC_2.35":
                struct.pack_into("<IHHII", data, a, 0x09691A75, fl, other, target, anext); done += 1
            if not anext: break
            a += anext
        if not nxt: break
        pos += nxt
    if not done:
        print("patch_compositor: no GLIBC_2.35 reference (already patched)"); return
    if not os.path.exists(p + ".orig"): shutil.copy2(p, p + ".orig")
    open(p, "wb").write(data)
    print(f"patch_compositor: rewrote {done} GLIBC_2.35 reference(s) to GLIBC_2.2.5")

main()
