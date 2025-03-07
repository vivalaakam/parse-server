'use strict';

const request = require('../lib/request');
const triggers = require('../lib/triggers');
const HooksController = require('../lib/Controllers/HooksController').default;
const express = require('express');
const auth = require('../lib/Auth');
const Config = require('../lib/Config');

const port = 34567;
const hookServerURL = 'http://localhost:' + port;

describe('Hooks', () => {
  let server;
  let app;
  beforeEach(done => {
    if (!app) {
      app = express();
      app.use(express.json({ type: '*/*' }));
      server = app.listen(port, undefined, done);
    } else {
      done();
    }
  });

  afterAll(done => {
    server.close(done);
  });

  it('should have no hooks registered', done => {
    Parse.Hooks.getFunctions().then(
      res => {
        expect(res.constructor).toBe(Array.prototype.constructor);
        done();
      },
      err => {
        jfail(err);
        done();
      }
    );
  });

  it('should have no triggers registered', done => {
    Parse.Hooks.getTriggers().then(
      res => {
        expect(res.constructor).toBe(Array.prototype.constructor);
        done();
      },
      err => {
        jfail(err);
        done();
      }
    );
  });

  it_id('26c9a13d-3d71-452e-a91c-9a4589be021c')(it)('should CRUD a function registration', done => {
    // Create
    Parse.Hooks.createFunction('My-Test-Function', 'http://someurl')
      .then(response => {
        expect(response.functionName).toBe('My-Test-Function');
        expect(response.url).toBe('http://someurl');
        // Find
        return Parse.Hooks.getFunction('My-Test-Function');
      })
      .then(response => {
        expect(response.objectId).toBeUndefined();
        expect(response.url).toBe('http://someurl');
        return Parse.Hooks.updateFunction('My-Test-Function', 'http://anotherurl');
      })
      .then(res => {
        expect(res.objectId).toBeUndefined();
        expect(res.functionName).toBe('My-Test-Function');
        expect(res.url).toBe('http://anotherurl');
        // delete
        return Parse.Hooks.removeFunction('My-Test-Function');
      })
      .then(() => {
        // Find again! but should be deleted
        return Parse.Hooks.getFunction('My-Test-Function').then(
          res => {
            fail('Failed to delete hook');
            fail(res);
            done();
            return Promise.resolve();
          },
          err => {
            expect(err.code).toBe(143);
            expect(err.message).toBe('no function named: My-Test-Function is defined');
            done();
            return Promise.resolve();
          }
        );
      })
      .catch(error => {
        jfail(error);
        done();
      });
  });

  it_id('7a81069e-2ee9-47fb-8e27-1120eda09e99')(it)('should CRUD a trigger registration', done => {
    // Create
    Parse.Hooks.createTrigger('MyClass', 'beforeDelete', 'http://someurl')
      .then(
        res => {
          expect(res.className).toBe('MyClass');
          expect(res.triggerName).toBe('beforeDelete');
          expect(res.url).toBe('http://someurl');
          // Find
          return Parse.Hooks.getTrigger('MyClass', 'beforeDelete');
        },
        err => {
          fail(err);
          done();
        }
      )
      .then(
        res => {
          expect(res).not.toBe(null);
          expect(res).not.toBe(undefined);
          expect(res.objectId).toBeUndefined();
          expect(res.url).toBe('http://someurl');
          // delete
          return Parse.Hooks.updateTrigger('MyClass', 'beforeDelete', 'http://anotherurl');
        },
        err => {
          jfail(err);
          done();
        }
      )
      .then(
        res => {
          expect(res.className).toBe('MyClass');
          expect(res.url).toBe('http://anotherurl');
          expect(res.objectId).toBeUndefined();

          return Parse.Hooks.removeTrigger('MyClass', 'beforeDelete');
        },
        err => {
          jfail(err);
          done();
        }
      )
      .then(
        () => {
          // Find again! but should be deleted
          return Parse.Hooks.getTrigger('MyClass', 'beforeDelete');
        },
        err => {
          jfail(err);
          done();
        }
      )
      .then(
        function () {
          fail('should not succeed');
          done();
        },
        err => {
          if (err) {
            expect(err).not.toBe(null);
            expect(err).not.toBe(undefined);
            expect(err.code).toBe(143);
            expect(err.message).toBe('class MyClass does not exist');
          } else {
            fail('should have errored');
          }
          done();
        }
      );
  });

  it('should fail to register hooks without Master Key', done => {
    request({
      method: 'POST',
      url: Parse.serverURL + '/hooks/functions',
      headers: {
        'X-Parse-Application-Id': Parse.applicationId,
      },
      body: JSON.stringify({
        url: 'http://hello.word',
        functionName: 'SomeFunction',
      }),
    }).then(fail, response => {
      const body = response.data;
      expect(body.error).toBe('unauthorized');
      done();
    });
  });

  it_id('f7ad092f-81dc-4729-afd1-3b02db2f0948')(it)('should fail trying to create two times the same function', done => {
    Parse.Hooks.createFunction('my_new_function', 'http://url.com')
      .then(() => jasmine.timeout())
      .then(
        () => {
          return Parse.Hooks.createFunction('my_new_function', 'http://url.com');
        },
        () => {
          fail('should create a new function');
        }
      )
      .then(
        () => {
          fail('should not be able to create the same function');
        },
        err => {
          expect(err).not.toBe(undefined);
          expect(err).not.toBe(null);
          if (err) {
            expect(err.code).toBe(143);
            expect(err.message).toBe('function name: my_new_function already exists');
          }
          return Parse.Hooks.removeFunction('my_new_function');
        }
      )
      .then(
        () => {
          done();
        },
        err => {
          jfail(err);
          done();
        }
      );
  });

  it_id('4db8c249-9174-4e8e-b959-55c8ea959a02')(it)('should fail trying to create two times the same trigger', done => {
    Parse.Hooks.createTrigger('MyClass', 'beforeSave', 'http://url.com')
      .then(
        () => {
          return Parse.Hooks.createTrigger('MyClass', 'beforeSave', 'http://url.com');
        },
        () => {
          fail('should create a new trigger');
        }
      )
      .then(
        () => {
          fail('should not be able to create the same trigger');
        },
        err => {
          expect(err).not.toBe(undefined);
          expect(err).not.toBe(null);
          if (err) {
            expect(err.code).toBe(143);
            expect(err.message).toBe('class MyClass already has trigger beforeSave');
          }
          return Parse.Hooks.removeTrigger('MyClass', 'beforeSave');
        }
      )
      .then(
        () => {
          done();
        },
        err => {
          jfail(err);
          done();
        }
      );
  });

  it("should fail trying to update a function that don't exist", done => {
    Parse.Hooks.updateFunction('A_COOL_FUNCTION', 'http://url.com')
      .then(
        () => {
          fail('Should not succeed');
        },
        err => {
          expect(err).not.toBe(undefined);
          expect(err).not.toBe(null);
          if (err) {
            expect(err.code).toBe(143);
            expect(err.message).toBe('no function named: A_COOL_FUNCTION is defined');
          }
          return Parse.Hooks.getFunction('A_COOL_FUNCTION');
        }
      )
      .then(
        () => {
          fail('the function should not exist');
          done();
        },
        err => {
          expect(err).not.toBe(undefined);
          expect(err).not.toBe(null);
          if (err) {
            expect(err.code).toBe(143);
            expect(err.message).toBe('no function named: A_COOL_FUNCTION is defined');
          }
          done();
        }
      );
  });

  it("should fail trying to update a trigger that don't exist", done => {
    Parse.Hooks.updateTrigger('AClassName', 'beforeSave', 'http://url.com')
      .then(
        () => {
          fail('Should not succeed');
        },
        err => {
          expect(err).not.toBe(undefined);
          expect(err).not.toBe(null);
          if (err) {
            expect(err.code).toBe(143);
            expect(err.message).toBe('class AClassName does not exist');
          }
          return Parse.Hooks.getTrigger('AClassName', 'beforeSave');
        }
      )
      .then(
        () => {
          fail('the function should not exist');
          done();
        },
        err => {
          expect(err).not.toBe(undefined);
          expect(err).not.toBe(null);
          if (err) {
            expect(err.code).toBe(143);
            expect(err.message).toBe('class AClassName does not exist');
          }
          done();
        }
      );
  });

  it('should fail trying to create a malformed function', done => {
    Parse.Hooks.createFunction('MyFunction').then(
      res => {
        fail(res);
      },
      err => {
        expect(err).not.toBe(undefined);
        expect(err).not.toBe(null);
        if (err) {
          expect(err.code).toBe(143);
          expect(err.error).toBe('invalid hook declaration');
        }
        done();
      }
    );
  });

  it('should fail trying to create a malformed function (REST)', done => {
    request({
      method: 'POST',
      url: Parse.serverURL + '/hooks/functions',
      headers: {
        'X-Parse-Application-Id': Parse.applicationId,
        'X-Parse-Master-Key': Parse.masterKey,
      },
      body: JSON.stringify({ functionName: 'SomeFunction' }),
    }).then(fail, response => {
      const body = response.data;
      expect(body.error).toBe('invalid hook declaration');
      expect(body.code).toBe(143);
      done();
    });
  });

  it_id('96d99414-b739-4e36-b3f4-8135e0be83ea')(it)('should create hooks and properly preload them', done => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        Parse.Hooks.createTrigger('MyClass' + i, 'beforeSave', 'http://url.com/beforeSave/' + i)
      );
      promises.push(Parse.Hooks.createFunction('AFunction' + i, 'http://url.com/function' + i));
    }

    Promise.all(promises)
      .then(
        function () {
          for (let i = 0; i < 5; i++) {
            // Delete everything from memory, as the server just started
            triggers.removeTrigger('beforeSave', 'MyClass' + i, Parse.applicationId);
            triggers.removeFunction('AFunction' + i, Parse.applicationId);
            expect(
              triggers.getTrigger('MyClass' + i, 'beforeSave', Parse.applicationId)
            ).toBeUndefined();
            expect(triggers.getFunction('AFunction' + i, Parse.applicationId)).toBeUndefined();
          }
          const hooksController = new HooksController(
            Parse.applicationId,
            Config.get('test').database
          );
          return hooksController.load();
        },
        err => {
          jfail(err);
          fail('Should properly create all hooks');
          done();
        }
      )
      .then(
        function () {
          for (let i = 0; i < 5; i++) {
            expect(
              triggers.getTrigger('MyClass' + i, 'beforeSave', Parse.applicationId)
            ).not.toBeUndefined();
            expect(triggers.getFunction('AFunction' + i, Parse.applicationId)).not.toBeUndefined();
          }
          done();
        },
        err => {
          jfail(err);
          fail('should properly load all hooks');
          done();
        }
      );
  });

  it_id('fe7d41eb-e570-4804-ac1f-8b6c407fdafe')(it)('should run the function on the test server', done => {
    app.post('/SomeFunction', function (req, res) {
      res.json({ success: 'OK!' });
    });

    Parse.Hooks.createFunction('SOME_TEST_FUNCTION', hookServerURL + '/SomeFunction')
      .then(
        function () {
          return Parse.Cloud.run('SOME_TEST_FUNCTION');
        },
        err => {
          jfail(err);
          fail('Should not fail creating a function');
          done();
        }
      )
      .then(
        function (res) {
          expect(res).toBe('OK!');
          done();
        },
        err => {
          jfail(err);
          fail('Should not fail calling a function');
          done();
        }
      );
  });

  it_id('63985b4c-a212-4a86-aa0e-eb4600bb485b')(it)('should run the function on the test server (error handling)', done => {
    app.post('/SomeFunctionError', function (req, res) {
      res.json({ error: { code: 1337, error: 'hacking that one!' } });
    });
    // The function is deleted as the DB is dropped between calls
    Parse.Hooks.createFunction('SOME_TEST_FUNCTION', hookServerURL + '/SomeFunctionError')
      .then(
        function () {
          return Parse.Cloud.run('SOME_TEST_FUNCTION');
        },
        err => {
          jfail(err);
          fail('Should not fail creating a function');
          done();
        }
      )
      .then(
        function () {
          fail('Should not succeed calling that function');
          done();
        },
        err => {
          expect(err).not.toBe(undefined);
          expect(err).not.toBe(null);
          if (err) {
            expect(err.code).toBe(Parse.Error.SCRIPT_FAILED);
            expect(err.message.code).toEqual(1337);
            expect(err.message.error).toEqual('hacking that one!');
          }
          done();
        }
      );
  });

  it_id('bacc1754-2a3a-4a7a-8d0e-f80af36da1ef')(it)('should provide X-Parse-Webhook-Key when defined', done => {
    app.post('/ExpectingKey', function (req, res) {
      if (req.get('X-Parse-Webhook-Key') === 'hook') {
        res.json({ success: 'correct key provided' });
      } else {
        res.json({ error: 'incorrect key provided' });
      }
    });

    Parse.Hooks.createFunction('SOME_TEST_FUNCTION', hookServerURL + '/ExpectingKey')
      .then(
        function () {
          return Parse.Cloud.run('SOME_TEST_FUNCTION');
        },
        err => {
          jfail(err);
          fail('Should not fail creating a function');
          done();
        }
      )
      .then(
        function (res) {
          expect(res).toBe('correct key provided');
          done();
        },
        err => {
          jfail(err);
          fail('Should not fail calling a function');
          done();
        }
      );
  });

  it_id('eeb67946-42c6-4581-89af-2abb4927913e')(it)('should not pass X-Parse-Webhook-Key if not provided', done => {
    reconfigureServer({ webhookKey: undefined }).then(() => {
      app.post('/ExpectingKeyAlso', function (req, res) {
        if (req.get('X-Parse-Webhook-Key') === 'hook') {
          res.json({ success: 'correct key provided' });
        } else {
          res.json({ error: 'incorrect key provided' });
        }
      });

      Parse.Hooks.createFunction('SOME_TEST_FUNCTION', hookServerURL + '/ExpectingKeyAlso')
        .then(
          function () {
            return Parse.Cloud.run('SOME_TEST_FUNCTION');
          },
          err => {
            jfail(err);
            fail('Should not fail creating a function');
            done();
          }
        )
        .then(
          function () {
            fail('Should not succeed calling that function');
            done();
          },
          err => {
            expect(err).not.toBe(undefined);
            expect(err).not.toBe(null);
            if (err) {
              expect(err.code).toBe(Parse.Error.SCRIPT_FAILED);
              expect(err.message).toEqual('incorrect key provided');
            }
            done();
          }
        );
    });
  });

  it_id('21decb65-4b93-4791-85a3-ab124a9ea3ac')(it)('should run the beforeSave hook on the test server', done => {
    let triggerCount = 0;
    app.post('/BeforeSaveSome', function (req, res) {
      triggerCount++;
      const object = req.body.object;
      object.hello = 'world';
      // Would need parse cloud express to set much more
      // But this should override the key upon return
      res.json({ success: object });
    });
    // The function is deleted as the DB is dropped between calls
    Parse.Hooks.createTrigger('SomeRandomObject', 'beforeSave', hookServerURL + '/BeforeSaveSome')
      .then(function () {
        const obj = new Parse.Object('SomeRandomObject');
        return obj.save();
      })
      .then(function (res) {
        expect(triggerCount).toBe(1);
        return res.fetch();
      })
      .then(function (res) {
        expect(res.get('hello')).toEqual('world');
        done();
      })
      .catch(err => {
        jfail(err);
        fail('Should not fail creating a function');
        done();
      });
  });

  it_id('52e3152b-5514-4418-9e76-1f394368b8fb')(it)('beforeSave hooks should correctly handle responses containing entire object', done => {
    app.post('/BeforeSaveSome2', function (req, res) {
      const object = Parse.Object.fromJSON(req.body.object);
      object.set('hello', 'world');
      res.json({ success: object });
    });
    Parse.Hooks.createTrigger('SomeRandomObject2', 'beforeSave', hookServerURL + '/BeforeSaveSome2')
      .then(function () {
        const obj = new Parse.Object('SomeRandomObject2');
        return obj.save();
      })
      .then(function (res) {
        return res.save();
      })
      .then(function (res) {
        expect(res.get('hello')).toEqual('world');
        done();
      })
      .catch(err => {
        fail(`Should not fail: ${JSON.stringify(err)}`);
        done();
      });
  });

  it_id('d27a7587-abb5-40d5-9805-051ee91de474')(it)('should run the afterSave hook on the test server', done => {
    let triggerCount = 0;
    let newObjectId;
    app.post('/AfterSaveSome', function (req, res) {
      triggerCount++;
      const obj = new Parse.Object('AnotherObject');
      obj.set('foo', 'bar');
      obj.save().then(function (obj) {
        newObjectId = obj.id;
        res.json({ success: {} });
      });
    });
    // The function is deleted as the DB is dropped between calls
    Parse.Hooks.createTrigger('SomeRandomObject', 'afterSave', hookServerURL + '/AfterSaveSome')
      .then(function () {
        const obj = new Parse.Object('SomeRandomObject');
        return obj.save();
      })
      .then(function () {
        return new Promise(resolve => {
          setTimeout(() => {
            expect(triggerCount).toBe(1);
            new Parse.Query('AnotherObject').get(newObjectId).then(r => resolve(r));
          }, 500);
        });
      })
      .then(function (res) {
        expect(res.get('foo')).toEqual('bar');
        done();
      })
      .catch(err => {
        jfail(err);
        fail('Should not fail creating a function');
        done();
      });
  });
});

describe('triggers', () => {
  it('should produce a proper request object with context in beforeSave', () => {
    const config = Config.get('test');
    const master = auth.master(config);
    const context = {
      originalKey: 'original',
    };
    const req = triggers.getRequestObject(
      triggers.Types.beforeSave,
      master,
      {},
      {},
      config,
      context
    );
    expect(req.context.originalKey).toBe('original');
    req.context = {
      key: 'value',
    };
    expect(context.key).toBe(undefined);
    req.context = {
      key: 'newValue',
    };
    expect(context.key).toBe(undefined);
  });

  it('should produce a proper request object with context in afterSave', () => {
    const config = Config.get('test');
    const master = auth.master(config);
    const context = {};
    const req = triggers.getRequestObject(
      triggers.Types.afterSave,
      master,
      {},
      {},
      config,
      context
    );
    expect(req.context).not.toBeUndefined();
  });

  it('should not set context on beforeFind', () => {
    const config = Config.get('test');
    const master = auth.master(config);
    const context = {};
    const req = triggers.getRequestObject(
      triggers.Types.beforeFind,
      master,
      {},
      {},
      config,
      context
    );
    expect(req.context).toBeUndefined();
  });
});

describe('sanitizing names', () => {
  const invalidNames = [
    `test'%3bdeclare%20@q%20varchar(99)%3bset%20@q%3d'%5c%5cxxxxxxxxxxxxxxx.yyyyy'%2b'fy.com%5cxus'%3b%20exec%20master.dbo.xp_dirtree%20@q%3b--%20`,
    `test.function.name`,
  ];

  it('should not crash server and return error on invalid Cloud Function name', async () => {
    for (const invalidName of invalidNames) {
      let error;
      try {
        await Parse.Cloud.run(invalidName);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toMatch(/Invalid function/);
    }
  });

  it('should not crash server and return error on invalid Cloud Job name', async () => {
    for (const invalidName of invalidNames) {
      let error;
      try {
        await Parse.Cloud.startJob(invalidName);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toMatch(/Invalid job/);
    }
  });
});
