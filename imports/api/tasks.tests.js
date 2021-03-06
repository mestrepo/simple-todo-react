/* eslint-env mocha */

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { assert } from 'chai';
import { Accounts } from "meteor/accounts-base";

import { Tasks } from './tasks.js';

if (Meteor.isServer) {
    describe('Tasks', () => {
        describe('methods', () => {
            const username = 'me';
            let taskId, userId;

            before(() => {
                // Create user if not already created
                const user = Meteor.users.findOne({username: username});
                if (!user) {
                    userId = Accounts.createUser({
                        'username': username,
                        'email': username + '@email.org',
                        'password' : username+ 'password'
                    })
                } else {
                    userId = user._id;
                }
            });

            beforeEach(() => {
                Tasks.remove({});
                taskId = Tasks.insert({
                    text: 'test task',
                    createdAt: new Date(),
                    owner: userId,
                    username: 'tmeasday',
                });
            });

            /**
             * Delete tests
             */
            it('can delete owned task', () => {
                // Find the internal implementation of the task method so we can
                // test it in isolation
                const deleteTask = Meteor.server.method_handlers['tasks.remove'];

                // Set up a fake method invocation that looks like what the method expects
                const invocation = { userId };

                // Run the method with `this` set to the fake invocation
                deleteTask.apply(invocation, [taskId]);

                // Verify that the method does what we expected
                assert.equal(Tasks.find().count(), 0);
            });

            it("cannot delete someone else's task", () => {
                // Set existing task private
                Tasks.update(taskId, {$set: { private: true}});

                // Generate random ID to rep another user
                const anotherUserId = Random.id();
                
                // Isolate delete method
                const deleteTask = Meteor.server.method_handlers['tasks.remove'];
                
                // create fake userId object for method
                const fakeUserObject = {'userId' : anotherUserId};

                //Verify that exception is thrown
                assert.throws(function() {
                    // Run the method with `this` set to the fake UserObject
                    deleteTask.apply(fakeUserObject, [taskId]);
                }, Meteor.Error, 'not-authorized');

                // Verify that task is not deleted
                assert.equal(Tasks.find().count(), 1);
            });

            /**
             * Insert tests
             */
            it("can insert task", () => {
                // 1. housekeeping/set up environment
                const taskOneText = 'task one';

                // 2. get method unit
                const insertTask = Meteor.server.method_handlers['tasks.insert'];

                // 3. Setup fake global object
                // create fake user object
                let fakeUserObject = {
                    'userId': userId,
                    'username': username
                };

                // 4. Run method with fake object and required arguments
                insertTask.apply(fakeUserObject, [taskOneText]);

                // 5. Perform checks
                assert.equal(Tasks.find().count(), 2);
            });

            it("cannot insert task if not logged in", () => {
                // 1. housekeeping/set up environment
                const taskOneText = 'task one';

                // 2. get method unit
                const insertTask = Meteor.server.method_handlers['tasks.insert'];

                // 3. Setup fake global object
                // create fake user object without userID
                // to emulate User not logged in
                let fakeUserObject = {
                    'username': username
                };

                // 4. Run method with fake object and required arguments
                // Verify that exception is thrown when trying to insert
                // when not logged in
                assert.throws(function() {
                    insertTask.apply(fakeUserObject, [taskOneText]);
                }, Meteor.Error, 'not-authorized');

                // 5. Perform checks
                assert.equal(Tasks.find().count(), 1);
            });

            /**
             * Set Checked
             */
            it("can set task checked", () => {
                // 1. housekeeping/set up environment
                const setToPrivate = true;

                // 2. get method unit
                const setTaskChecked = Meteor.server.method_handlers['tasks.setChecked'];

                // 3. Setup fake global object
                let fakeUserObject = {
                    'userId' : userId,
                    'username': username,
                    'private' : true
                }

                assert.isNotTrue(Tasks.findOne(taskId).private);

                // 4. Run method with fake object and required arguments
                setTaskChecked.apply(fakeUserObject, [taskId, setToPrivate]);

                // 5. Perform checks
                assert.equal(Tasks.find({checked: true}).count(), 1);
            });

            it("cannot set someone else's private task checked", () => {
                // 1. housekeeping/set up environment
                // Set task to private
                const setToPrivate = true;
                Tasks.update(taskId, { $set: { private: setToPrivate } });

                // 2. get method unit
                // Generate a random ID, rep. a different user
                const anotherUserId = Random.id();

                // 3. Setup fake global object
                const fakeUserObject = { "userId": anotherUserId };

                // 4. Run method with fake object and required arguments
                // Run test
                const setChecked = Meteor.server.method_handlers['tasks.setChecked'];

                // 5. Perform checks
                // Verify that error is thrown
                assert.throws(function() {
                    setChecked.apply(fakeUserObject, [taskId, setToPrivate])
                }, Meteor.Error, 'not-authorized');
            });

            /**
             * Set private
             */
            it("can set task private", () => {
                // 1. housekeeping/set up environment
                const setToPrivate = true;

                // 2. get method unit
                // Get method
                const setPrivate = Meteor.server.method_handlers['tasks.setPrivate'];

                // 3. Setup fake global object
                // Create fake user object
                const fakeUserObject = { userId };

                // 4. Run method with fake object and required arguments
                // Run tests
                setPrivate.apply(fakeUserObject, [taskId, setToPrivate]);

                // 5. Perform checks
                assert.equal(Tasks.find({private: setToPrivate}).count(), 1);
            });

            it("cannot set someone else's private task private", () => {
                // 1. housekeeping/set up environment
                const anotherUserId = Random.id();

                // 2. get method unit
                const setPrivate = Meteor.server.method_handlers['tasks.setPrivate'];

                // 3. Setup fake global object
                const fakeUserObject = { 'userId': anotherUserId };

                // 4. Run method with fake object and required arguments
                assert.throws(function() {
                    setPrivate.apply(fakeUserObject, [taskId, true]);
                }, Meteor.Error, 'not-authorized');

                // 5. Perform checks
                assert.equal(Tasks.find({private: true}).count(), 0);
            });
        });
    });
}