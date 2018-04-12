( function ( mw, $ ) {
	var sandbox, contentSelector, selectionPlayer, player, storage;

	QUnit.module( 'ext.wikispeech.selectionPlayer', {
		setup: function () {
			mw.wikispeech.storage =
				sinon.stub( new mw.wikispeech.Storage() );
			storage = mw.wikispeech.storage;
			storage.utterances = [
				{
					audio: $( '<audio></audio>' ).get( 0 ),
					startOffset: 0,
					endOffset: 14,
					content: [ { string: 'Utterance zero.' } ]
				},
				{
					audio: $( '<audio></audio>' ).get( 0 ),
					content: [ { string: 'Utterance one.' } ]
				}
			];
			// Assume that the utterance is already prepared, fire
			// callback immediately.
			storage.prepareUtterance.callsArg( 1 );
			mw.wikispeech.player =
				sinon.stub( new mw.wikispeech.Player() );
			player = mw.wikispeech.player;
			selectionPlayer =
				new mw.wikispeech.SelectionPlayer();
			sandbox = sinon.sandbox.create();
			$( '#qunit-fixture' ).append(
				$( '<div></div>' ).attr( 'id', 'content' )
			);
			contentSelector =
				mw.config.get( 'wgWikispeechContentSelector' );
		},
		teardown: function () {
			sandbox.restore();
			// Remove the event listeners to not trigger them after
			// the tests have run.
			$( document ).off( 'mouseup' );
		}
	} );

	/**
	 * Create a mocked `Selection`.
	 *
	 * This is used to mock user selecting text. To create a selection
	 * that starts and end in the same text node, the third argument
	 * is the end offset. To create a selection that ends in a
	 * different text node, the third argument is the end node and the
	 * fourth is the end offset.
	 *
	 * Note that the end offset of the resulting `Selection` object is
	 * the position after the supplied end offset parameter. This is
	 * because the visual selection reaches up to but not including
	 * the end offset.
	 *
	 * @param {number} startOffset The offset of selection start.
	 * @param {HTMLElement} startContainer The node where selection starts.
	 * @param {number} endOffset The offset of selection end.
	 * @param {HTMLElement} [endContainer] The node where selection
	 *  ends. If omitted, this will be the same as `startContainer`.
	 * @return {Object} A mocked `Selection` object.
	 */

	function createMockedSelection(
		startOffset,
		startContainer,
		endOffset,
		endContainer
	) {
		endContainer = endContainer || startContainer;
		return {
			rangeCount: 1,
			getRangeAt: function () {
				return {
					startContainer: startContainer,
					startOffset: startOffset,
					endContainer: endContainer,
					endOffset: endOffset + 1
				};
			}
		};
	}

	QUnit.test( 'playSelection()', function ( assert ) {
		var textNode, selection;

		assert.expect( 3 );
		mw.wikispeech.test.util.setContentHtml(
			'Utterance with selected text.'
			//              [-----------]
			// The line above shows what part of the text that is
			// selected. The selection includes the characters above
			// the brackets and everything in between.
		);
		textNode = $( contentSelector ).contents().get( 0 );
		selection = createMockedSelection( 15, textNode, 27 );
		sandbox.stub( window, 'getSelection' ).returns( selection );
		storage.utterances[ 0 ].audio.src = 'loaded';
		storage.utterances[ 0 ].endOffset = 28;
		storage.utterances[ 0 ].content = [ {
			path: './text()'
		} ];
		storage.utterances[ 0 ].tokens = [
			{
				string: 'Utterance',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startTime: 0.0,
				endTime: 1.0,
				startOffset: 0,
				endOffset: 8
			},
			{
				string: 'with',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startTime: 1.0,
				endTime: 2.0,
				startOffset: 10,
				endOffset: 13
			},
			{
				string: 'selected',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startTime: 2.0,
				endTime: 3.0,
				startOffset: 15,
				endOffset: 22
			},
			{
				string: 'text',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startTime: 3.0,
				endTime: 3.5,
				startOffset: 24,
				endOffset: 27
			}
		];
		storage.getStartUtterance.returns( storage.utterances[ 0 ] );
		storage.getStartToken.returns( storage.utterances[ 0 ].tokens[ 2 ] );
		storage.getEndUtterance.returns( storage.utterances[ 0 ] );
		storage.getEndToken.returns( storage.utterances[ 0 ].tokens[ 3 ] );
		sinon.spy( selectionPlayer, 'setStartTime' );
		sinon.spy( selectionPlayer, 'setEndTime' );

		selectionPlayer.playSelection();

		sinon.assert.calledWith(
			player.playUtterance,
			storage.utterances[ 0 ]
		);
		sinon.assert.calledWith(
			selectionPlayer.setStartTime,
			storage.utterances[ 0 ],
			2.0
		);
		sinon.assert.calledWith(
			selectionPlayer.setEndTime,
			storage.utterances[ 0 ],
			3.5
		);
	} );

	QUnit.test( 'playSelection(): multiple ranges', function ( assert ) {
		var selection, textNode1, textNode2;

		assert.expect( 2 );
		mw.wikispeech.test.util.setContentHtml(
			'Utterance with selected <del>not selectable</del>text.'
			//              [-------]                         [--]
		);
		textNode1 = $( contentSelector ).contents().get( 0 );
		textNode2 = $( contentSelector ).contents().get( 2 );
		selection = {
			rangeCount: 2,
			getRangeAt: function ( index ) {
				if ( index === 0 ) {
					return {
						startContainer: textNode1,
						startOffset: 15,
						endContainer: textNode1,
						endOffset: 24
					};
				} else if ( index === 1 ) {
					return {
						startContainer: textNode2,
						startOffset: 0,
						endContainer: textNode2,
						endOffset: 4
					};
				}
			}
		};
		sandbox.stub( window, 'getSelection' ).returns( selection );
		storage.utterances[ 0 ].audio.src = 'loaded';
		storage.utterances[ 0 ].content = [
			{ path: './text()[1]' },
			{ path: './b/text()' },
			{ path: './text()[2]' }
		];
		storage.utterances[ 0 ].endOffset = 18;
		storage.utterances[ 0 ].tokens = [
			{
				string: 'Utterance',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startTime: 0.0,
				endTime: 1.0,
				startOffset: 0,
				endOffset: 8
			},
			{
				string: 'with',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startTime: 1.0,
				endTime: 2.0,
				startOffset: 10,
				endOffset: 13
			},
			{
				string: 'selected',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 15,
				endOffset: 22,
				startTime: 3.0
			},
			{
				string: 'text',
				items: [ storage.utterances[ 0 ].content[ 2 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 0,
				endOffset: 3,
				endTime: 5.0
			},
			{
				string: '.',
				items: [ storage.utterances[ 0 ].content[ 2 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 4,
				endOffset: 4,
				endTime: 3.0
			}
		];
		storage.getStartUtterance.returns( storage.utterances[ 0 ] );
		storage.getStartToken.returns( storage.utterances[ 0 ].tokens[ 2 ] );
		storage.getEndUtterance.returns( storage.utterances[ 0 ] );
		storage.getEndToken.returns( storage.utterances[ 0 ].tokens[ 3 ] );
		sinon.spy( selectionPlayer, 'setStartTime' );
		sinon.spy( selectionPlayer, 'setEndTime' );

		selectionPlayer.playSelection();

		sinon.assert.calledWith(
			selectionPlayer.setStartTime,
			storage.utterances[ 0 ],
			3.0
		);
		sinon.assert.calledWith(
			selectionPlayer.setEndTime,
			storage.utterances[ 0 ],
			5.0
		);
	} );

	QUnit.test( 'playSelection(): spanning multiple nodes', function ( assert ) {
		var textNode1, textNode2, selection;

		assert.expect( 2 );
		mw.wikispeech.test.util.setContentHtml(
			'Utterance with selected text <b>and </b>more selected text.'
			//              [-----------------------------------------]
		);
		textNode1 = $( contentSelector ).contents().get( 0 );
		textNode2 = $( contentSelector ).contents().get( 2 );
		selection = createMockedSelection( 15, textNode1, 17, textNode2 );
		sandbox.stub( window, 'getSelection' ).returns( selection );
		storage.utterances[ 0 ].audio.src = 'loaded';
		storage.utterances[ 0 ].content = [
			{ path: './text()[1]' },
			{ path: './b/text()' },
			{ path: './text()[2]' }
		];
		storage.utterances[ 0 ].endOffset = 18;
		storage.utterances[ 0 ].tokens = [
			{
				string: 'selected',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 15,
				endOffset: 22,
				startTime: 1.0
			},
			{
				string: 'text',
				items: [ storage.utterances[ 0 ].content[ 2 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 14,
				endOffset: 17,
				endTime: 2.0
			}
		];
		storage.getStartUtterance.returns( storage.utterances[ 0 ] );
		storage.getStartToken.returns( storage.utterances[ 0 ].tokens[ 0 ] );
		storage.getEndUtterance.returns( storage.utterances[ 0 ] );
		storage.getEndToken.returns( storage.utterances[ 0 ].tokens[ 1 ] );
		sinon.spy( selectionPlayer, 'setStartTime' );
		sinon.spy( selectionPlayer, 'setEndTime' );

		selectionPlayer.playSelection();

		sinon.assert.calledWith(
			selectionPlayer.setStartTime,
			storage.utterances[ 0 ],
			1.0
		);
		sinon.assert.calledWith(
			selectionPlayer.setEndTime,
			storage.utterances[ 0 ],
			2.0
		);
	} );

	QUnit.test( 'playSelection(): selected nodes are elements', function ( assert ) {
		var parent, selection;

		assert.expect( 2 );
		mw.wikispeech.test.util.setContentHtml(
			'<b>Utterance zero.</b>'
			//  [-------------]
		);
		parent = $( contentSelector + ' b' ).get( 0 );
		selection = createMockedSelection( 0, parent, 1 );
		sandbox.stub( window, 'getSelection' ).returns( selection );
		storage.utterances[ 0 ].audio.src = 'loaded';
		storage.utterances[ 0 ].content = [ { path: './b/text()' } ];
		storage.utterances[ 0 ].tokens = [
			{
				string: 'Utterance',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 0,
				endOffset: 8,
				startTime: 1.0
			},
			{
				string: 'zero',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 10,
				endOffset: 13
			},
			{
				string: '.',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 14,
				endOffset: 14,
				endTime: 2.0
			}
		];
		storage.getStartUtterance.returns( storage.utterances[ 0 ] );
		storage.getStartToken.returns( storage.utterances[ 0 ].tokens[ 0 ] );
		storage.getEndUtterance.returns( storage.utterances[ 0 ] );
		storage.getEndToken.returns( storage.utterances[ 0 ].tokens[ 2 ] );
		sinon.spy( selectionPlayer, 'setStartTime' );
		sinon.spy( selectionPlayer, 'setEndTime' );

		selectionPlayer.playSelection();

		sinon.assert.calledWith(
			selectionPlayer.setStartTime,
			storage.utterances[ 0 ],
			1.0
		);
		sinon.assert.calledWith(
			selectionPlayer.setEndTime,
			storage.utterances[ 0 ],
			2.0
		);
	} );

	QUnit.test( 'playSelection(): selected nodes are elements that also contain non-utterance nodes', function ( assert ) {
		var parent, selection;

		assert.expect( 2 );
		mw.wikispeech.test.util.setContentHtml(
			'<b>Not an utterance<br />Utterance zero.<br />Not an utterance</b>'
			//  [---------------------------------------------------------]
		);
		parent = $( contentSelector + ' b' ).get( 0 );
		selection = createMockedSelection( 0, parent, 1 );
		sandbox.stub( window, 'getSelection' ).returns( selection );
		storage.utterances[ 0 ].audio.src = 'loaded';
		storage.utterances[ 0 ].content = [ { path: './b/text()[2]' } ];
		storage.utterances[ 0 ].tokens = [
			{
				string: 'Utterance',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 0,
				endOffset: 8,
				startTime: 1.0
			},
			{
				string: 'zero',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 10,
				endOffset: 13
			},
			{
				string: '.',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 14,
				endOffset: 14,
				endTime: 2.0
			}
		];
		storage.getStartUtterance.returns( storage.utterances[ 0 ] );
		storage.getStartToken.returns( storage.utterances[ 0 ].tokens[ 0 ] );
		storage.getEndUtterance.returns( storage.utterances[ 0 ] );
		storage.getEndToken.returns( storage.utterances[ 0 ].tokens[ 2 ] );
		sinon.spy( selectionPlayer, 'setStartTime' );
		sinon.spy( selectionPlayer, 'setEndTime' );

		selectionPlayer.playSelection();

		sinon.assert.calledWith(
			selectionPlayer.setStartTime,
			storage.utterances[ 0 ],
			1.0
		);
		sinon.assert.calledWith(
			selectionPlayer.setEndTime,
			storage.utterances[ 0 ],
			2.0
		);
	} );

	QUnit.test( 'playSelectionIfValid(): valid', function ( assert ) {
		var actualResult;

		assert.expect( 2 );
		sinon.stub( selectionPlayer, 'isSelectionValid' )
			.returns( true );
		sinon.stub( selectionPlayer, 'playSelection' );

		actualResult = selectionPlayer.playSelectionIfValid();

		sinon.assert.called( selectionPlayer.playSelection );
		assert.strictEqual( actualResult, true );
	} );

	QUnit.test( 'playSelectionIfValid(): invalid', function ( assert ) {
		var actualResult;

		assert.expect( 2 );
		sinon.stub( selectionPlayer, 'isSelectionValid' )
			.returns( false );
		sinon.stub( selectionPlayer, 'playSelection' );

		actualResult = selectionPlayer.playSelectionIfValid();

		sinon.assert.notCalled( selectionPlayer.playSelection );
		assert.strictEqual( actualResult, false );
	} );

	QUnit.test( 'setEndTime()', function ( assert ) {
		this.clock = sinon.useFakeTimers();

		storage.utterances[ 0 ].audio.src = 'loaded';
		storage.utterances[ 0 ].tokens = [ {} ];
		storage.utterances[ 0 ].audio.currentTime = 0.5;
		selectionPlayer.setEndTime( storage.utterances[ 0 ], 1.5 );
		$( storage.utterances[ 0 ].audio ).trigger( 'playing' );

		this.clock.tick( 1000 );

		assert.strictEqual( storage.utterances[ 0 ].audio.paused, true );
		this.clock.restore();
	} );

	QUnit.test( 'resetPreviousEndUtterance()', function ( assert ) {
		assert.expect( 1 );
		this.clock = sinon.useFakeTimers();
		mw.wikispeech.test.util.setContentHtml(
			'Utterance with selected text.'
		);
		storage.utterances[ 0 ].audio.src = 'loaded';
		storage.utterances[ 0 ].endOffset = 28;
		storage.utterances[ 0 ].content = [ { path: './text()' } ];
		storage.utterances[ 0 ].tokens = [
			{
				string: 'Utterance',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 0,
				endOffset: 8
			},
			{
				string: 'with',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 10,
				endOffset: 13
			},
			{
				string: 'selected',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 15,
				endOffset: 22,
				startTime: 2.0
			},
			{
				string: 'text',
				items: [ storage.utterances[ 0 ].content[ 0 ] ],
				utterance: storage.utterances[ 0 ],
				startOffset: 24,
				endOffset: 27,
				endTime: 4.0
			}
		];
		selectionPlayer.setEndTime( storage.utterances[ 0 ], 1.0 );
		selectionPlayer.previousEndUtterance = storage.utterances[ 0 ];
		selectionPlayer.resetPreviousEndUtterance();
		storage.utterances[ 0 ].audio.play();
		$( storage.utterances[ 0 ].audio ).trigger( 'playing' );

		this.clock.tick( 1000 );

		assert.strictEqual( storage.utterances[ 0 ].audio.paused, false );
		this.clock.restore();
	} );

	QUnit.test( 'getFirstNodeInSelection()', function ( assert ) {
		var expectedNode, selection, actualNode;
		assert.expect( 1 );
		mw.wikispeech.test.util.setContentHtml(
			'before<selected>first text node</selected>after'
			//               [-------------]

		);
		expectedNode =
			$( contentSelector + ' selected' ).contents().get( 0 );
		selection = createMockedSelection( 0, expectedNode, 14 );
		sandbox.stub( window, 'getSelection' ).returns( selection );

		actualNode =
			selectionPlayer.getFirstNodeInSelection();

		assert.strictEqual( actualNode, expectedNode );
	} );

	QUnit.test( 'getFirstNodeInSelection(): start offset greater than max', function ( assert ) {
		var expectedNode, selection, previousNode, actualNode;

		assert.expect( 1 );
		mw.wikispeech.test.util.setContentHtml(
			'before<selected>first text node</selected>after'
			//               [-------------]
		);
		expectedNode =
			$( contentSelector + ' selected' ).get( 0 );
		previousNode =
			$( contentSelector ).contents().get( 0 );
		selection =
			createMockedSelection( 6, previousNode, 14, expectedNode );
		sandbox.stub( window, 'getSelection' ).returns( selection );

		actualNode =
			selectionPlayer.getFirstNodeInSelection();

		assert.strictEqual( actualNode, expectedNode );
	} );

	QUnit.test( 'getFirstNodeInSelection(): start offset greater than max, no sibling', function ( assert ) {
		var expectedNode, previousNode, selection, actualNode;

		assert.expect( 1 );
		mw.wikispeech.test.util.setContentHtml(
			'<a><b>before</b></a><selected>first text node</selected>after'
			//                             [-------------]

		);
		expectedNode =
			$( contentSelector + ' selected' ).get( 0 );
		previousNode =
			$( contentSelector + ' a b' ).contents().get( 0 );
		selection =
			createMockedSelection( 6, previousNode, 14, expectedNode );
		sandbox.stub( window, 'getSelection' ).returns( selection );

		actualNode =
			selectionPlayer.getFirstNodeInSelection();

		assert.strictEqual( actualNode, expectedNode );
	} );

	QUnit.test( 'getLastNodeInSelection()', function ( assert ) {
		var expectedNode, selection, actualNode;

		assert.expect( 1 );
		mw.wikispeech.test.util.setContentHtml(
			'before<selected>last text node</selected>after'
			//               [------------]

		);
		expectedNode =
			$( contentSelector + ' selected' ).contents().get( 0 );
		selection = createMockedSelection( 0, expectedNode, 13 );
		sandbox.stub( window, 'getSelection' ).returns( selection );

		actualNode =
			selectionPlayer.getLastNodeInSelection();

		assert.strictEqual( actualNode, expectedNode );
	} );

	QUnit.test( 'getLastNodeInSelection(): end offset is zero', function ( assert ) {
		var expectedNode, nextNode, selection, actualNode;

		assert.expect( 1 );
		mw.wikispeech.test.util.setContentHtml(
			'before<selected>last text node</selected>after'
			//               [------------]
		);
		expectedNode =
			$( contentSelector + ' selected' ).get( 0 );
		nextNode = $( contentSelector ).contents().get( 2 );
		selection =
			createMockedSelection( 0, expectedNode, -1, nextNode );
		sandbox.stub( window, 'getSelection' ).returns( selection );

		actualNode =
			selectionPlayer.getLastNodeInSelection();

		assert.strictEqual( actualNode, expectedNode );
	} );

	QUnit.test( 'getLastNodeInSelection(): end offset is zero, no sibling', function ( assert ) {
		var expectedNode, nextNode, selection, actualNode;

		assert.expect( 1 );
		mw.wikispeech.test.util.setContentHtml(
			'before<selected>last text node</selected><a><b>after</b></a>'
			//               [------------]

		);
		expectedNode = $( contentSelector + ' selected' ).get( 0 );
		nextNode = $( contentSelector + ' a b' ).contents().get( 0 );
		selection = createMockedSelection( 0, expectedNode, -1, nextNode );
		sandbox.stub( window, 'getSelection' ).returns( selection );

		actualNode = selectionPlayer.getLastNodeInSelection();

		assert.strictEqual( actualNode, expectedNode );
	} );
}( mediaWiki, jQuery ) );
