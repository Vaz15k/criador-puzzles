$(document).ready(function() {
    let editorBoard = null;
    let puzzleList = [];
    let pageCounter = 0;
    let selectedTool = null;

    const pieceThemeUrl = 'img/chesspieces/default/{piece}.png';

    function updatePuzzleOrder() {
        const newPuzzleOrder = [];
        $('#outputContainer .position-wrapper').each(function() {
            const puzzleId = $(this).data('id');
            const puzzleData = puzzleList.find(p => p.id === puzzleId);
            if (puzzleData) {
                newPuzzleOrder.push(puzzleData);
            }
        });
        puzzleList = newPuzzleOrder;
    }

    const config = {
        draggable: true,
        position: 'start',
        showNotation: true,
        pieceTheme: pieceThemeUrl,
        onDragStart: function(source, piece, position, orientation) {
            if (selectedTool) {
                $('.palette-piece').removeClass('selected-tool');
                selectedTool = null;
            }
        },
        onChange: function(oldPos, newPos) {
             $('#fenInput').val(Chessboard.objToFen(newPos));
        }
    };
    editorBoard = Chessboard('boardEditor', config);
    $('#fenInput').val(editorBoard.fen());
    $('#fenInput').on('change', () => editorBoard.position($('#fenInput').val()));

    $('.palette-piece').on('click', function() {
        const tool = $(this).data('piece');
        
        if ($(this).hasClass('selected-tool')) {
            selectedTool = null;
            $(this).removeClass('selected-tool');
        } else {
            selectedTool = tool;
            $('.palette-piece').removeClass('selected-tool');
            $(this).addClass('selected-tool');
        }
    });

    $('#boardEditor').on('click', '.square-55d63', function() {
        if (!selectedTool) {
            return;
        }

        const square = $(this).data('square');
        let currentPosition = editorBoard.position();

        if (selectedTool === 'delete') {
            delete currentPosition[square];
        } else {
            currentPosition[square] = selectedTool;
        }

        editorBoard.position(currentPosition, false);
    });

    $('#clearBoardBtn').on('click', function() {
        editorBoard.clear(false);
    });

    $('#startPosBtn').on('click', function() {
        editorBoard.start(false);
    });

    $('#addPositionBtn').on('click', function() {
        const fen = editorBoard.fen();
        const turn = $('input[name="turn"]:checked').val();
        const puzzleId = 'puzzle-' + Date.now();
        puzzleList.push({ id: puzzleId, fen, turn });

        if ($('#outputContainer .grid-container').length === 0) {
            pageCounter++;
            const pageHtml = `<div class="page" id="page-${pageCounter}"><div class="grid-container"></div></div>`;
            $('#outputContainer').append(pageHtml);
            $('.grid-container').sortable({
                placeholder: "sortable-placeholder",
                cursor: "grabbing",
                update: function(event, ui) {
                    updatePuzzleOrder();
                }
            }).disableSelection();
        }
        
        const positionHtml = `
            <div class="position-wrapper" data-id="${puzzleId}">
                <button class="delete-btn" title="Remover Posição">X</button>
                <div class="position-board"></div>
                <div class="position-info">${turn}<br>_____________</div>
            </div>`;
        
        const newPuzzleElement = $(positionHtml);
        $('.grid-container').append(newPuzzleElement);

        const boardElement = newPuzzleElement.find('.position-board')[0];
        if (boardElement) {
            Chessboard(boardElement, {
                position: fen,
                showNotation: true,
                pieceTheme: pieceThemeUrl
            });
        }
    });

    $('#outputContainer').on('click', '.delete-btn', function() {
        const puzzleWrapper = $(this).closest('.position-wrapper');
        const puzzleIdToRemove = puzzleWrapper.data('id');
        puzzleList = puzzleList.filter(p => p.id !== puzzleIdToRemove);
        puzzleWrapper.fadeOut(300, function() {
            $(this).remove();
        });
    });

    $('#clearAllBtn').on('click', function() {
        $('#outputContainer').empty();
        puzzleList = [];
        pageCounter = 0;
        editorBoard.position('start');
    });

    $('#exportImgBtn').on('click', function() {
        if (puzzleList.length === 0) { return; }
        html2canvas(document.querySelector("#outputContainer"), { useCORS: true }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'puzzles_xadrez.png';
            link.click();
        });
    });

    $('#exportPdfBtn').on('click', async function() {
        if (puzzleList.length === 0) { return; }
        const exportButton = $(this);
        exportButton.prop('disabled', true).text('Gerando PDF...');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const useWhiteBg = $('#whiteBgExport').is(':checked');
        const puzzlesPerPage = 4;
        const margin = 15;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const puzzleSize = (pageWidth - (margin * 2) - 10) / 2;
        const positions = [
            { x: margin, y: margin },
            { x: margin + puzzleSize + 10, y: margin },
            { x: margin, y: margin + puzzleSize + 20 },
            { x: margin + puzzleSize + 10, y: margin + puzzleSize + 20 }
        ];
        for (let i = 0; i < puzzleList.length; i++) {
            if (i > 0 && (i % puzzlesPerPage === 0)) {
                pdf.addPage();
            }
            const puzzle = puzzleList[i];
            const pos = positions[i % puzzlesPerPage];
            const tempId = `temp-board-${i}`;
            const tempDiv = $(`<div id="${tempId}" class="hidden-board-for-export"></div>`);
            if (useWhiteBg) { tempDiv.addClass('export-white-bg'); }
            $('body').append(tempDiv);
            const tempBoardElement = document.getElementById(tempId);
            if (tempBoardElement) {
                Chessboard(tempBoardElement, { position: puzzle.fen, pieceTheme: pieceThemeUrl });
                const canvas = await html2canvas(tempBoardElement, { backgroundColor: useWhiteBg ? '#FFFFFF' : '#333333' });
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', pos.x, pos.y, puzzleSize, puzzleSize);
                pdf.setFontSize(12);
                pdf.text(`${puzzle.turn}: _______________________`, pos.x, pos.y + puzzleSize + 8);
            }
            tempDiv.remove();
        }
        pdf.save('taticos_xadrez.pdf');
        exportButton.prop('disabled', false).text('Exportar para PDF');
    });
});