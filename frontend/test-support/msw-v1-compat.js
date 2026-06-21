const actual = require('../node_modules/msw/lib/core/index.js');

const { HttpResponse, http } = actual;

function createContext() {
  return {
    status(code) {
      return (state) => {
        state.status = code;
        return state;
      };
    },
    json(data) {
      return (state) => {
        state.body = JSON.stringify(data);
        state.headers.set('content-type', 'application/json');
        return state;
      };
    },
  };
}

function createResponseFactory() {
  const responseFactory = (...transforms) => {
    const state = {
      body: null,
      headers: new Headers(),
      status: 200,
    };

    for (const transform of transforms) {
      transform(state);
    }

    return new HttpResponse(state.body, {
      headers: state.headers,
      status: state.status,
    });
  };

  responseFactory.networkError = () => {
    return HttpResponse.error();
  };

  return responseFactory;
}

function adapt(method) {
  return (path, resolver) =>
    http[method](path, (args) => {
      return resolver(args.request, createResponseFactory(), createContext());
    });
}

module.exports = {
  ...actual,
  rest: {
    delete: adapt('delete'),
    get: adapt('get'),
    patch: adapt('patch'),
    post: adapt('post'),
    put: adapt('put'),
  },
};
