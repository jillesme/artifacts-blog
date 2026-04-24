/**
 * Minimal in-memory filesystem for isomorphic-git inside Workers.
 * Workers don't expose a disk, so isomorphic-git needs a fake `fs`.
 *
 * Implements just enough of the Node `fs` API for isomorphic-git's
 * clone/fetch/commit/push/log flows:
 *   - readFile / writeFile / unlink
 *   - readdir / mkdir / rmdir
 *   - stat / lstat
 *   - readlink / symlink (stubbed — we don't use symlinks)
 *
 * Exposes both callback-style methods and a `.promises` namespace, matching
 * what isomorphic-git will pick up.
 */

type Entry =
  | { type: 'file'; data: Uint8Array; mtime: Date }
  | { type: 'dir'; mtime: Date };

function normalize(path: string): string {
  if (path === '' || path === '/') return '/';
  // Collapse duplicate slashes and drop trailing slash (except root).
  const parts = path.split('/').filter(Boolean);
  return '/' + parts.join('/');
}

function parent(path: string): string {
  const n = normalize(path);
  if (n === '/') return '/';
  const idx = n.lastIndexOf('/');
  return idx === 0 ? '/' : n.slice(0, idx);
}

function encode(data: string | Uint8Array): Uint8Array {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  // Make a defensive copy so later mutations don't corrupt the store.
  return new Uint8Array(data);
}

class FakeStat {
  readonly size: number;
  constructor(
    private readonly entry: Entry,
    size: number,
  ) {
    this.size = size;
  }
  isFile() {
    return this.entry.type === 'file';
  }
  isDirectory() {
    return this.entry.type === 'dir';
  }
  isSymbolicLink() {
    return false;
  }
  // isomorphic-git reads these properties directly.
  get mode() {
    return this.entry.type === 'dir' ? 0o040755 : 0o100644;
  }
  get dev() {
    return 0;
  }
  get ino() {
    return 0;
  }
  get uid() {
    return 0;
  }
  get gid() {
    return 0;
  }
  get type() {
    return this.entry.type === 'dir' ? 'dir' : 'file';
  }
  get mtime() {
    return this.entry.mtime;
  }
  get mtimeMs() {
    return this.entry.mtime.getTime();
  }
  get ctime() {
    return this.entry.mtime;
  }
  get ctimeMs() {
    return this.entry.mtime.getTime();
  }
}

class ENOENT extends Error {
  code = 'ENOENT';
  constructor(path: string) {
    super(`ENOENT: no such file or directory, ${path}`);
  }
}

class ENOTDIR extends Error {
  code = 'ENOTDIR';
  constructor(path: string) {
    super(`ENOTDIR: not a directory, ${path}`);
  }
}

class EEXIST extends Error {
  code = 'EEXIST';
  constructor(path: string) {
    super(`EEXIST: file already exists, ${path}`);
  }
}

class EISDIR extends Error {
  code = 'EISDIR';
  constructor(path: string) {
    super(`EISDIR: is a directory, ${path}`);
  }
}

type ReadFileOpts = { encoding?: string } | string | undefined | null;

export class MemoryFS {
  private readonly store = new Map<string, Entry>();

  constructor() {
    this.store.set('/', { type: 'dir', mtime: new Date() });
  }

  private ensureParent(path: string) {
    const p = parent(path);
    const e = this.store.get(p);
    if (!e) throw new ENOENT(p);
    if (e.type !== 'dir') throw new ENOTDIR(p);
  }

  private _readFile(path: string, opts?: ReadFileOpts): Uint8Array | string {
    const p = normalize(path);
    const e = this.store.get(p);
    if (!e) throw new ENOENT(p);
    if (e.type !== 'file') throw new EISDIR(p);
    const encoding =
      typeof opts === 'string' ? opts : opts && typeof opts === 'object' ? opts.encoding : undefined;
    if (encoding === 'utf8' || encoding === 'utf-8') return new TextDecoder().decode(e.data);
    // Return a fresh copy to avoid aliasing.
    return new Uint8Array(e.data);
  }

  private _writeFile(path: string, data: string | Uint8Array) {
    const p = normalize(path);
    this._mkdirp(parent(p));
    this.store.set(p, { type: 'file', data: encode(data), mtime: new Date() });
  }

  private _unlink(path: string) {
    const p = normalize(path);
    const e = this.store.get(p);
    if (!e) throw new ENOENT(p);
    if (e.type === 'dir') throw new EISDIR(p);
    this.store.delete(p);
  }

  private _readdir(path: string): string[] {
    const p = normalize(path);
    const e = this.store.get(p);
    if (!e) throw new ENOENT(p);
    if (e.type !== 'dir') throw new ENOTDIR(p);
    const prefix = p === '/' ? '/' : p + '/';
    const entries = new Set<string>();
    for (const key of this.store.keys()) {
      if (key === p) continue;
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      if (!rest) continue;
      const first = rest.split('/')[0];
      if (first) entries.add(first);
    }
    return [...entries];
  }

  private _mkdir(path: string) {
    const p = normalize(path);
    if (this.store.has(p)) throw new EEXIST(p);
    this.ensureParent(p);
    this.store.set(p, { type: 'dir', mtime: new Date() });
  }

  private _mkdirp(path: string) {
    const p = normalize(path);
    if (this.store.has(p)) return;
    const segments = p.split('/').filter(Boolean);
    let acc = '';
    for (const seg of segments) {
      acc += '/' + seg;
      if (!this.store.has(acc)) this.store.set(acc, { type: 'dir', mtime: new Date() });
    }
  }

  private _rmdir(path: string) {
    const p = normalize(path);
    const e = this.store.get(p);
    if (!e) throw new ENOENT(p);
    if (e.type !== 'dir') throw new ENOTDIR(p);
    // remove directory and all descendants
    const prefix = p === '/' ? '/' : p + '/';
    for (const key of [...this.store.keys()]) {
      if (key === p || key.startsWith(prefix)) this.store.delete(key);
    }
    if (p !== '/') this.store.set('/', this.store.get('/')!);
  }

  private _stat(path: string): FakeStat {
    const p = normalize(path);
    const e = this.store.get(p);
    if (!e) throw new ENOENT(p);
    const size = e.type === 'file' ? e.data.byteLength : 0;
    return new FakeStat(e, size);
  }

  // ── Node-style callback API (isomorphic-git accepts either). ──
  readFile = (path: string, opts: ReadFileOpts, cb?: Function) => {
    if (typeof opts === 'function') {
      cb = opts as Function;
      opts = undefined;
    }
    try {
      cb!(null, this._readFile(path, opts));
    } catch (err) {
      cb!(err);
    }
  };

  writeFile = (path: string, data: string | Uint8Array, opts: unknown, cb?: Function) => {
    if (typeof opts === 'function') {
      cb = opts as Function;
    }
    try {
      this._writeFile(path, data);
      cb!(null);
    } catch (err) {
      cb!(err);
    }
  };

  unlink = (path: string, cb: Function) => {
    try {
      this._unlink(path);
      cb(null);
    } catch (err) {
      cb(err);
    }
  };

  readdir = (path: string, cb: Function) => {
    try {
      cb(null, this._readdir(path));
    } catch (err) {
      cb(err);
    }
  };

  mkdir = (path: string, opts: unknown, cb?: Function) => {
    if (typeof opts === 'function') {
      cb = opts as Function;
    }
    try {
      this._mkdir(path);
      cb!(null);
    } catch (err) {
      cb!(err);
    }
  };

  rmdir = (path: string, cb: Function) => {
    try {
      this._rmdir(path);
      cb(null);
    } catch (err) {
      cb(err);
    }
  };

  stat = (path: string, cb: Function) => {
    try {
      cb(null, this._stat(path));
    } catch (err) {
      cb(err);
    }
  };

  lstat = (path: string, cb: Function) => {
    try {
      cb(null, this._stat(path));
    } catch (err) {
      cb(err);
    }
  };

  readlink = (_path: string, cb: Function) => cb(new Error('ENOSYS: symlinks not supported'));
  symlink = (_target: string, _path: string, cb: Function) =>
    cb(new Error('ENOSYS: symlinks not supported'));

  // ── Promise-style API that isomorphic-git prefers. ──
  promises = {
    readFile: async (path: string, opts?: ReadFileOpts) => this._readFile(path, opts),
    writeFile: async (path: string, data: string | Uint8Array) => {
      this._writeFile(path, data);
    },
    unlink: async (path: string) => {
      this._unlink(path);
    },
    readdir: async (path: string) => this._readdir(path),
    mkdir: async (path: string) => {
      // Support `recursive` mode since isomorphic-git calls it this way.
      this._mkdirp(path);
    },
    rmdir: async (path: string) => {
      this._rmdir(path);
    },
    stat: async (path: string) => this._stat(path),
    lstat: async (path: string) => this._stat(path),
    readlink: async () => {
      throw new Error('ENOSYS: symlinks not supported');
    },
    symlink: async () => {
      throw new Error('ENOSYS: symlinks not supported');
    },
  };
}
