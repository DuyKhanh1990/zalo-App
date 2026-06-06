// Stub for simple-git — returns resolved promises for every method
function makeGitProxy() {
  const handler = {
    get(target, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
      return (...args) => {
        const result = {
          isRepo: false,
          files: [],
          created: [],
          deleted: [],
          modified: [],
          not_added: [],
          conflicted: [],
          staged: [],
          renamed: [],
          current: 'main',
          tracking: null,
          ahead: 0,
          behind: 0,
          detached: false,
          all: [],
          branches: {},
          latest: null,
          total: { all: 0 },
        };
        const proxy = new Proxy(result, handler);
        return Promise.resolve(proxy);
      };
    }
  };
  return new Proxy({}, handler);
}

function simpleGit() {
  return makeGitProxy();
}

simpleGit.default = simpleGit;
module.exports = simpleGit;
module.exports.default = simpleGit;
