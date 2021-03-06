( function ( mw, $ ) {
	var contentSelector, util, highlighter, storage;

	QUnit.module( 'ext.wikispeech.highlighter', {
		setup: function () {
			util = mw.wikispeech.test.util;
			contentSelector = mw.config.get( 'wgWikispeechContentSelector' );
			util.setContentHtml( 'Utterance zero.' );
			mw.wikispeech.storage =
				sinon.stub( new mw.wikispeech.Storage() );
			storage = mw.wikispeech.storage;
			storage.utterances = [
				{
					startOffset: 0,
					endOffset: 14,
					content: [ { path: './text()' } ]
				}
			];
			highlighter = new mw.wikispeech.Highlighter();
		}
	} );

	QUnit.test( 'highlightUtterance()', function ( assert ) {
		assert.expect( 2 );
		storage.getNodeForItem.returns(
			$( contentSelector ).contents().get( 0 )
		);

		highlighter.highlightUtterance( storage.utterances[ 0 ] );

		assert.strictEqual(
			$( contentSelector ).html(),
			'<span class="ext-wikispeech-highlight-sentence">Utterance zero.</span>'
		);
		assert.strictEqual(
			$( '.ext-wikispeech-highlight-sentence' ).prop( 'textPath' ),
			'./text()'
		);
	} );

	QUnit.test( 'highlightUtterance(): multiple utterances', function ( assert ) {
		assert.expect( 1 );
		util.setContentHtml(
			'Utterance zero. Utterance one. Utterance two.'
		);
		storage.getNodeForItem.returns(
			$( contentSelector ).contents().get( 0 )
		);
		storage.utterances[ 1 ] = {
			startOffset: 16,
			endOffset: 29,
			content: [ { path: './text()' } ]
		};

		highlighter.highlightUtterance( storage.utterances[ 1 ] );

		assert.strictEqual(
			$( contentSelector ).html(),
			'Utterance zero. <span class="ext-wikispeech-highlight-sentence">Utterance one.</span> Utterance two.'
		);
	} );

	QUnit.test( 'highlightUtterance(): with tags', function ( assert ) {
		assert.expect( 1 );
		util.setContentHtml(
			'<p>Utterance with <b>a</b> tag.</p>'
		);
		storage.getNodeForItem.onCall( 0 ).returns(
			$( contentSelector + ' p' ).contents().get( 0 )
		);
		storage.getNodeForItem.onCall( 1 ).returns(
			$( contentSelector + ' p b' ).contents().get( 0 )
		);
		storage.getNodeForItem.onCall( 2 ).returns(
			$( contentSelector + ' p' ).contents().get( 2 )
		);
		storage.utterances[ 0 ] = {
			startOffset: 0,
			endOffset: 4,
			content: [
				{ path: './p/text()[1]' },
				{ path: './p/b/text()' },
				{ path: './p/text()[2]' }
			]
		};

		highlighter.highlightUtterance( storage.utterances[ 0 ] );

		assert.strictEqual(
			$( contentSelector ).html(),
			'<p><span class="ext-wikispeech-highlight-sentence">Utterance with </span><b><span class="ext-wikispeech-highlight-sentence">a</span></b><span class="ext-wikispeech-highlight-sentence"> tag.</span></p>'
		);
	} );

	QUnit.test( 'highlightUtterance(): wrap middle text nodes properly', function ( assert ) {
		assert.expect( 1 );
		util.setContentHtml( 'First<br />middle<br />last. Next utterance.' );
		storage.getNodeForItem.onCall( 0 ).returns(
			$( contentSelector ).contents().get( 0 )
		);
		storage.getNodeForItem.onCall( 1 ).returns(
			$( contentSelector ).contents().get( 2 )
		);
		storage.getNodeForItem.onCall( 2 ).returns(
			$( contentSelector ).contents().get( 4 )
		);
		storage.utterances[ 0 ] = {
			startOffset: 0,
			endOffset: 4,
			content: [
				{ path: './text()[1]' },
				{ path: './text()[2]' },
				{ path: './text()[3]' }
			]
		};

		highlighter.highlightUtterance( storage.utterances[ 0 ] );

		assert.strictEqual(
			$( contentSelector ).html(),
			'<span class="ext-wikispeech-highlight-sentence">First</span><br><span class="ext-wikispeech-highlight-sentence">middle</span><br><span class="ext-wikispeech-highlight-sentence">last.</span> Next utterance.'
		);
	} );

	QUnit.test( 'removeWrappers()', function ( assert ) {
		assert.expect( 2 );
		util.setContentHtml( '<span class="wrapper">Utterance zero.</span>' );

		highlighter.removeWrappers( '.wrapper' );

		assert.strictEqual(
			$( contentSelector ).html(),
			'Utterance zero.'
		);
		assert.strictEqual( $( '.wrapper' ).contents().length, 0 );
	} );

	QUnit.test( 'removeWrappers(): restore text nodes as one', function ( assert ) {
		assert.expect( 3 );
		util.setContentHtml( 'prefix <span class="wrapper">Utterance zero.</span> suffix' );

		highlighter.removeWrappers( '.wrapper' );

		assert.strictEqual( $( contentSelector ).html(),
			'prefix Utterance zero. suffix'
		);
		assert.strictEqual( $( '.wrapper' ).contents().length, 0 );
		assert.strictEqual( $( contentSelector ).contents().length, 1 );
	} );

	QUnit.test( 'removeWrappers(): restore text nodes as one with inner wrapper', function ( assert ) {
		assert.expect( 2 );
		util.setContentHtml( '<span class="outer-wrapper">Utterance <span class="inner-wrapper">zero</span>.</span>' );

		highlighter.removeWrappers( '.outer-wrapper' );

		assert.strictEqual(
			$( contentSelector ).html(),
			'Utterance <span class="inner-wrapper">zero</span>.'
		);
		assert.strictEqual( $( '.outer-wrapper' ).contents().length, 0 );
	} );

	QUnit.test( 'removeWrappers(): multiple wrappers', function ( assert ) {
		assert.expect( 3 );
		util.setContentHtml( '<span class="wrapper">Utterance</span> <span class="wrapper">zero.</span>' );

		highlighter.removeWrappers( '.wrapper' );

		assert.strictEqual(
			$( contentSelector ).html(),
			'Utterance zero.'
		);
		assert.strictEqual( $( contentSelector ).contents().length, 1 );
		assert.strictEqual( $( '.wrapper' ).contents().length, 0 );
	} );

	QUnit.test( 'highlightToken()', function ( assert ) {
		var highlightedToken;

		assert.expect( 1 );
		storage.getNodeForItem.returns(
			$( contentSelector ).contents().get( 0 )
		);

		highlightedToken = {
			utterance: storage.utterances[ 0 ],
			startOffset: 0,
			endOffset: 8,
			items: [ storage.utterances[ 0 ].content[ 0 ] ]
		};

		highlighter.highlightToken( highlightedToken );

		assert.strictEqual(
			$( contentSelector ).html(),
			'<span class="ext-wikispeech-highlight-word">Utterance</span> zero.'
		);
	} );

	QUnit.test( 'highlightToken(): multiple utterances', function ( assert ) {
		var highlightedToken;

		assert.expect( 1 );
		util.setContentHtml( 'Utterance zero. Utterance one.' );
		storage.getNodeForItem.returns(
			$( contentSelector ).contents().get( 0 )
		);
		storage.utterances[ 1 ] = {
			startOffset: 16,
			content: [ { path: './text()' } ]
		};
		highlightedToken = {
			utterance: storage.utterances[ 1 ],
			startOffset: 16,
			endOffset: 24,
			items: [ storage.utterances[ 1 ].content[ 0 ] ]
		};
		storage.utterances[ 1 ].tokens = [ highlightedToken ];

		highlighter.highlightToken( highlightedToken );

		assert.strictEqual(
			$( contentSelector ).html(),
			'Utterance zero. <span class="ext-wikispeech-highlight-word">Utterance</span> one.'
		);
	} );

	QUnit.test( 'highlightToken(): with utterance highlighting', function ( assert ) {
		var highlightedToken;

		assert.expect( 1 );
		util.setContentHtml( '<span class="ext-wikispeech-highlight-sentence">Utterance with token.</span>' );
		$( '.ext-wikispeech-highlight-sentence' )
			.prop( 'textPath', './text()' );
		highlightedToken = {
			utterance: storage.utterances[ 0 ],
			startOffset: 15,
			endOffset: 19,
			items: [ storage.utterances[ 0 ].content[ 0 ] ]
		};
		storage.utterances[ 0 ].tokens = [ highlightedToken ];

		highlighter.highlightToken( highlightedToken );

		assert.strictEqual(
			$( contentSelector ).html(),
			'<span class="ext-wikispeech-highlight-sentence">Utterance with <span class="ext-wikispeech-highlight-word">token</span>.</span>'
		);
	} );

	QUnit.test( 'highlightToken(): with utterance highlighting and multiple utterances', function ( assert ) {
		var highlightedToken;

		assert.expect( 1 );
		util.setContentHtml(
			'Utterance zero. <span class="ext-wikispeech-highlight-sentence">Utterance one.</span>'
		);
		$( '.ext-wikispeech-highlight-sentence' )
			.prop( 'textPath', './text()' );
		storage.utterances[ 1 ] = {
			startOffset: 16,
			content: [ { path: './text()' } ]
		};
		highlightedToken = {
			utterance: storage.utterances[ 1 ],
			startOffset: 16,
			endOffset: 24,
			items: [ storage.utterances[ 1 ].content[ 0 ] ]
		};
		storage.utterances[ 1 ].tokens = [ highlightedToken ];

		highlighter.highlightToken( highlightedToken );

		assert.strictEqual(
			$( contentSelector ).html(),
			'Utterance zero. <span class="ext-wikispeech-highlight-sentence"><span class="ext-wikispeech-highlight-word">Utterance</span> one.</span>'
		);
	} );

	QUnit.test( 'highlightToken(): with utterance highlighting and other spans', function ( assert ) {
		var highlightedToken;

		assert.expect( 1 );
		util.setContentHtml( '<span><span class="ext-wikispeech-highlight-sentence">Utterance with token.</span></span>' );
		$( '.ext-wikispeech-highlight-sentence' )
			.prop( 'textPath', './span/text()' );
		storage.utterances[ 0 ].content[ 0 ] = { path: './span/text()' };
		highlightedToken = {
			utterance: storage.utterances[ 0 ],
			startOffset: 15,
			endOffset: 19,
			items: [ storage.utterances[ 0 ].content[ 0 ] ]
		};
		storage.utterances[ 0 ].tokens = [ highlightedToken ];

		highlighter.highlightToken( highlightedToken );

		assert.strictEqual(
			$( contentSelector ).html(),
			'<span><span class="ext-wikispeech-highlight-sentence">Utterance with <span class="ext-wikispeech-highlight-word">token</span>.</span></span>'
		);
	} );

	QUnit.test( 'highlightToken(): with tags', function ( assert ) {
		var highlightedToken;

		assert.expect( 1 );
		util.setContentHtml( 'Utterance with <br />token.' );
		storage.getNodeForItem.returns(
			$( contentSelector ).contents().get( 2 )
		);
		storage.utterances[ 0 ].content[ 0 ] = { path: './text()[2]' };
		highlightedToken = {
			utterance: storage.utterances[ 0 ],
			startOffset: 0,
			endOffset: 4,
			items: [ storage.utterances[ 0 ].content[ 0 ] ]
		};
		storage.utterances[ 0 ].tokens = [ highlightedToken ];

		highlighter.highlightToken( highlightedToken );

		assert.strictEqual(
			$( contentSelector ).html(),
			'Utterance with <br><span class="ext-wikispeech-highlight-word">token</span>.'
		);
	} );

	QUnit.test( 'highlightToken(): with multiple utterance highlightings', function ( assert ) {
		var highlightedToken;

		assert.expect( 1 );
		util.setContentHtml( '<span class="ext-wikispeech-highlight-sentence">Phrase </span><b><span class="ext-wikispeech-highlight-sentence">one</span></b><span class="ext-wikispeech-highlight-sentence">, phrase two.</span>' );
		$( '.ext-wikispeech-highlight-sentence' )
			.get( 2 ).textPath = './text()[2]';
		storage.utterances[ 0 ].content[ 0 ] = { path: './text()[2]' };
		highlightedToken = {
			utterance: storage.utterances[ 0 ],
			startOffset: 2,
			endOffset: 7,
			items: [ storage.utterances[ 0 ].content[ 0 ] ]
		};
		storage.utterances[ 0 ].tokens = [ highlightedToken ];

		highlighter.highlightToken( highlightedToken );

		assert.strictEqual(
			$( contentSelector ).html(),
			'<span class="ext-wikispeech-highlight-sentence">Phrase </span><b><span class="ext-wikispeech-highlight-sentence">one</span></b><span class="ext-wikispeech-highlight-sentence">, <span class="ext-wikispeech-highlight-word">phrase</span> two.</span>'
		);
	} );

	QUnit.test( 'highlightToken(): with multiple utterance highlightings and text nodes', function ( assert ) {
		var highlightedToken;

		assert.expect( 1 );
		util.setContentHtml( 'Utterance <b>zero</b>. <span class="ext-wikispeech-highlight-sentence">Utterance one.</span>' );
		$( '.ext-wikispeech-highlight-sentence' )
			.prop( 'textPath', './text()[2]' );
		storage.utterances[ 1 ] = {
			startOffset: 2,
			content: [ { path: './text()[2]' } ]
		};
		highlightedToken = {
			utterance: storage.utterances[ 1 ],
			startOffset: 2,
			endOffset: 10,
			items: [ storage.utterances[ 1 ].content[ 0 ] ]
		};
		storage.utterances[ 1 ].tokens = [ highlightedToken ];

		highlighter.highlightToken( highlightedToken );

		assert.strictEqual(
			$( contentSelector ).html(),
			'Utterance <b>zero</b>. <span class="ext-wikispeech-highlight-sentence"><span class="ext-wikispeech-highlight-word">Utterance</span> one.</span>'
		);
	} );

	QUnit.test( 'highlightToken(): utterance highlighting starts in a new text node', function ( assert ) {
		var highlightedToken;

		assert.expect( 1 );
		util.setContentHtml( 'Utterance zero. <span class="ext-wikispeech-highlight-sentence">Utterance </span><b><span class="ext-wikispeech-highlight-sentence">one</span></b><span class="ext-wikispeech-highlight-sentence">.</span>' );
		$( '.ext-wikispeech-highlight-sentence' ).get( 1 ).textPath =
			'./b/text()';
		storage.utterances[ 1 ] = {
			startOffset: 2,
			content: [
				{ path: './text()[1]' },
				{ path: './b/text()' },
				{ path: './text()[2]' }
			]
		};
		highlightedToken = {
			utterance: storage.utterances[ 1 ],
			startOffset: 0,
			endOffset: 2,
			items: [ storage.utterances[ 1 ].content[ 1 ] ]
		};
		storage.utterances[ 1 ].tokens = [
			{},
			highlightedToken
		];

		highlighter.highlightToken( highlightedToken );

		assert.strictEqual(
			$( contentSelector ).html(),
			'Utterance zero. <span class="ext-wikispeech-highlight-sentence">Utterance </span><b><span class="ext-wikispeech-highlight-sentence"><span class="ext-wikispeech-highlight-word">one</span></span></b><span class="ext-wikispeech-highlight-sentence">.</span>'
		);
	} );
}( mediaWiki, jQuery ) );
