'use strict';

var assert = require('assert');
var util = require('util');
var Parser = require('../lib/nlp-parser');

describe('nlp-parser', function() {

    // Sentence: 'Add empty name check and changed email validation'
    var wordsAndTags = 'Add/VB empty/JJ name/NN check/NN and/CC changed/VBD email/NN validation/NN';
    var pennArr = [
        '(ROOT',
        '  (S',
        '    (VP',
        '      (VP (VB Add)',
        '        (NP (JJ empty) (NN name) (NN check)))',
        '      (CC and)',
        '      (VP (VBD changed)',
        '        (NP (NN email) (NN validation))))))'
        ];
    var pennParsed = Parser.newPennNode('ROOT', [
        Parser.newPennNode('S', [
            Parser.newPennNode('VP', [
                Parser.newPennNode('VP', [
                    Parser.newPennNode('VB Add', []),
                    Parser.newPennNode('NP', [
                        Parser.newPennNode('JJ empty', []),
                        Parser.newPennNode('NN name', []),
                        Parser.newPennNode('NN check', [])
                    ])
                ]),
                Parser.newPennNode('CC and', []),
                Parser.newPennNode('VP', [
                    Parser.newPennNode('VBD changed', []),
                    Parser.newPennNode('NP', [
                        Parser.newPennNode('NN email', []),
                        Parser.newPennNode('NN validation', [])
                    ])
                ])
            ])
        ])
    ]);

    it('should parse penn correctly', function() {
        var instance = new Parser();
        instance.penn = pennArr.join('\n');
        var instance2 = new Parser();
        instance2.penn = pennArr.join('\r\n');
        var instance3 = new Parser();
        instance3.penn = '';

        assert.deepEqual(removeCircularRefs(instance._penn), removeCircularRefs(pennParsed));
        assert.deepEqual(removeCircularRefs(instance2._penn), removeCircularRefs(pennParsed));
        assert.deepEqual(removeCircularRefs(instance3._penn), removeCircularRefs(Parser.newPennNode(null, [])));
    });

    it('should correctly use PennNode', function() {
        var instance = new Parser();
        instance.penn = pennArr.join('\n');
        var root = instance.penn;
        var got = root.getChildrenWithValue(/^S/)[0]
        .getChildrenWithValue(/^VP/)[0]
        .getChildrenWithValue(/^VP/)[1];
        var want = pennParsed.children[0].children[0].children[2];

        assert.deepEqual(removeCircularRefs(got), removeCircularRefs(want));

        got = root.getChildrenWithValue(/^S/)[0]
        .getChildrenWithValue(/^VP/)[0]
        .getChildrenWithValue(/^VP/)[1]
        .getHighestLevelNodesWithValue(/^VB/)[0];
        want = want.children[0];

        assert.deepEqual(removeCircularRefs(got), removeCircularRefs(want));
    });

    it('should parse sentences correctly', function(done) {
        this.timeout(5000); // allow enough time

        var sentences = [
           'Add empty name check and changed email validation',
           'Fixes nasty bug on the registration page',
           'Fixed bug in landing page',
           'Minor fixes regarding serializers'
        ];
        var fragArr = [
            '(ROOT',
            '  (FRAG',
            '    (NP (JJ Minor) (NNS fixes))',
            '    (PP (VBG regarding)',
            '      (NP (NNS serializers)))))'
            ];
        var fragParser = new Parser();
        fragParser.penn = fragArr.join('\n');

        Parser.parseSentences(sentences, 'newline', function(err, instances) {
            if (err) return done(err);

            assert.equal(instances.length, sentences.length);
            assert.equal(instances[0]._wordsAndTags, wordsAndTags);
            assert.deepEqual(removeCircularRefs(instances[0]._penn), removeCircularRefs(pennParsed));
            assert.equal(instances[1].penn.children[0].children[0].children[0].value, 'VBZ Fixes');
            assert(instances[2].hasVerb(), 'Sentence "' + instances[2]._wordsAndTags +
            '" has hasVerb===false while should be true');
            assert.notEqual(instances[2].isFragment(), true);
            assert(instances[3].isFragment());
            assert.deepEqual(removeCircularRefs(instances[3].penn), removeCircularRefs(fragParser.penn));
            done();
        });
    });

    it('should work without node-java', function(done) {
        this.timeout(5000); // allow enough time on Travis

        var sentences = [
           'CSS fixes',
           'Fix home page styling'
        ];
        var parserFn = Parser.parser;
        Parser.parser = function(cb) { cb(null, null); }
        Parser.parseSentences(sentences, 'newline', function(err, instances) {
            Parser.parser = parserFn;
            if (err) return done(err);

            assert.equal(instances[0]._wordsAndTags, 'CSS/NNP fixes/NNS');
            assert.deepEqual(removeCircularRefs(instances[1].penn), removeCircularRefs(
                Parser.newPennNode('ROOT', [
                    Parser.newPennNode('S', [
                        Parser.newPennNode('VP', [
                            Parser.newPennNode('VB Fix', []),
                            Parser.newPennNode('NP', [
                                Parser.newPennNode('NN home', []),
                                Parser.newPennNode('NN page', []),
                                Parser.newPennNode('NN styling', [])
                            ])
                        ])
                    ])
                ]))
            );
            done();
        });
    });

}); // describe nlp-parser

function removeCircularRefs(obj) {
    var circularRefs = ['parent'];
    for (var i in obj) {
        if (circularRefs.indexOf(i) !== -1) {
            delete obj[i];
        }
        if (obj.hasOwnProperty(i) && typeof(obj[i]) == 'object') {
            removeCircularRefs(obj[i]);
        }
    }
}
