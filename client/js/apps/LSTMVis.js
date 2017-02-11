/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 1/25/17.
 */
class LSTMVis {

    constructor(querySVG, resultSVG) {
        this.querySVG = querySVG;
        this.resultSVG = resultSVG;
        this.eventHandler = new SimpleEventHandler(this.querySVG.node());
        this.controller = new LSTMController({eventHandler: this.eventHandler});

        this.setupQuery();
        this.setupResult();

        this.bindDataEvents();
        this.bindUIEvents();

        this.controller.initByUrlAndRun();
    }

    setupQuery() {

        this.lineplot = new LinePlot({
            parent: this.querySVG, eventHandler: this.eventHandler,
            options: {
                cellWidth: this.controller.cellWidth,
                height: 200,
                pos: {x: 0, y: 5}
            }
        });

        this.wordSequence = new WordSequence({
            parent: this.querySVG, eventHandler: this.eventHandler,
            options: {
                cellWidth: this.controller.cellWidth,
                pos: {x: 60 - this.controller.cellWidth, y: 210 + 5}
            }
        });

        this.cellList = new CellList({
            parent: this.querySVG, eventHandler: this.eventHandler,
            options: {
                pos: {x: 0, y: 270}
            }
        })


    }

    setupResult() {
        this.resultList = new WordMatrix({
            parent: this.resultSVG, eventHandler: this.eventHandler,
            options: {
                cellWidth: this.controller.cellWidth
            }
        });
        this.resultList.update({
            words: [
                {pos: 0, words: ['abc', 'Monument']},
                {pos: -1, words: ['Erde', 'Welt']}
            ]
        });
    }

    bindDataEvents() {
        this.eventHandler.bind(LSTMController.events.newContextAvailable,
          () => {
              const states = this.controller.states;
              const timeSteps = states.right - states.left;

              const cellValues = states.data.map(
                (values, index) => ({values, index})
              );

              // const yScale = d3.scaleLinear().domain([,1])
              // this.lineplot.updateOptions({options: {yScale}})
              this.lineplot.update({timeSteps, cellValues});
              this.lineplot.actionUpdateThreshold(this.controller.threshold);


              this.wordSequence.update({
                  words: this.controller.words.words,
                  wordBrush: this.controller.wordBrush,
                  wordBrushZero: this.controller.wordBrushZero
              });

              this.updateCellSelection();

          });


        this.eventHandler.bind(LSTMController.events.newMatchingResults, () => {
            // console.log(this.controller.matchingWordMatrix);
            const words = this.controller.matchingWordMatrix;
            this.resultList.update({words})

        })

    }


    updateCellSelection(recalc = false) {
        const cellSelection = this.controller.cellSelection(recalc);
        this.lineplot.actionUpdateSelectedCells(cellSelection);

        if (cellSelection.length == 0) {
            this.wordSequence.actionChangeWordBackgrounds(null)
            this.cellList.update({cells: []})
        } else {
            const sumVec = this.controller.sumCellValues(cellSelection);
            const cScale = d3.scaleLinear().domain([0, d3.max(sumVec)]).range(['white', '#1399e4']);

            this.wordSequence.actionChangeWordBackgrounds(sumVec.map(v => cScale(v)))
            this.cellList.update({cells: cellSelection})
        }


    }

    bindUIEvents() {
        const cellWidthUpdate = () => {
            this.lineplot.updateOptions({
                options: {cellWidth: this.controller.cellWidth},
                reRender: true
            });

            this.wordSequence.updateOptions({
                options: {cellWidth: this.controller.cellWidth},
                reRender: true
            });
            this.wordSequence.base.attr('transform', `translate(${60 - this.controller.cellWidth},215)`)

            this.resultList.updateOptions({
                options: {cellWidth: this.controller.cellWidth},
                reRender: true
            });
        };


        d3.select('#smaller_btn').on('click', () => {
            this.controller.cellWidth = Math.max(5, this.controller.cellWidth - 5);
            cellWidthUpdate()
        });
        d3.select('#larger_btn').on('click', () => {
            this.controller.cellWidth = this.controller.cellWidth + 5;
            cellWidthUpdate()
        });

        d3.select('#match_precise').on('click',
          () => this.controller.requestMatch({mode: 'precise'}));

        d3.select('#match_fast').on('click',
          () => this.controller.requestMatch({mode: 'fast'}));
        // --------------------------------
        // -- Move Position ---
        // --------------------------------


        const modifyPos = offset => {
            const oldBrush = this.controller.wordBrush;
            if (oldBrush) {
                this.controller.wordBrush = [oldBrush[0] - offset, oldBrush[1] - offset]
            }
            this.controller.pos = this.controller.pos + offset;
            this.controller.requestContext({});
        }

        d3.select('#inc_pos').on('click', () => {
            modifyPos(+5);
        });
        d3.select('#dec_pos').on('click', () => {
            modifyPos(-5);
        });


        // --------------------------------
        // -- Brush Events and Handling ---
        // --------------------------------


        this.eventHandler.bind(WordSequence.events.brushSelectionChanged,
          sel => {
              this.controller.wordBrush = sel;
              this.updateCellSelection(true);
          }
        );

        this.eventHandler.bind(WordSequence.events.zeroBrushSelectionChanged,
          sel => {
              this.controller.wordBrushZero = sel;
              this.updateCellSelection(true);
          }
        );

        this.eventHandler.bind(LinePlot.events.thresholdChanged, th => {
              this.controller.threshold = Util.round(th.newValue, 4);
              this.updateCellSelection(true);
          }
        )


    }
}

const lstmVis = new LSTMVis(
  d3.select('#queryVis'),
  d3.select('#resultVis'));

lstmVis;
