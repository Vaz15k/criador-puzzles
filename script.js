$(document).ready(function() {
    let editorBoard = null;
    let puzzleList = [];
    let pageCounter = 0;
    let selectedTool = null;
    let mousePos = { x: -1, y: -1 };

    const chess = new Chess();
    let gameHistory = [];
    let currentMoveIndex = -1;

    const pieceThemeUrl = 'img/chesspieces/default/{piece}.png';

    $(document).on('mousemove', function(event) {
        mousePos.x = event.pageX;
        mousePos.y = event.pageY;
    });

    function pixelToSquare(x, y) {
        const boardElement = $('#boardEditor');
        const boardOffset = boardElement.offset();
        const boardSize = boardElement.width();
        const squareSize = boardSize / 8;
        
        let rankIndex = 7 - Math.floor((y - boardOffset.top) / squareSize);
        let fileIndex = Math.floor((x - boardOffset.left) / squareSize);

        if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) {
            return null;
        }

        const files = 'abcdefgh'.split('');
        const ranks = '12345678'.split('');

        if (editorBoard.orientation() === 'black') {
            return files[7 - fileIndex] + ranks[7 - rankIndex];
        }
        return files[fileIndex] + ranks[rankIndex];
    }

    function isDropOnTrash() {
        const trashCan = $('.palette-piece[data-piece="delete"]');
        if (!trashCan.length) return false;

        const pos = trashCan.offset();
        const width = trashCan.width();
        const height = trashCan.height();

        return mousePos.x >= pos.left && mousePos.x <= pos.left + width &&
               mousePos.y >= pos.top && mousePos.y <= pos.top + height;
    }

    // --- CONFIGURAÇÃO DO TABULEIRO COM A LÓGICA CORRIGIDA ---
    const config = {
        draggable: true,
        position: 'start',
        showNotation: true,
        pieceTheme: pieceThemeUrl,
        
        // ESTA É A CORREÇÃO PRINCIPAL:
        onDragStart: function(source, piece) {
            // Se a ferramenta 'delete' estiver ativa, previne o início do arrasto.
            // Isso permite que o evento de 'click' seja processado normalmente.
            if (selectedTool === 'delete') {
                return false; // Cancela o drag.
            }

            // Se qualquer outra ferramenta estiver ativa (ex: uma peça da paleta),
            // desmarca ela antes de iniciar um arrasto normal no tabuleiro.
            if (selectedTool) {
                $('.palette-piece').removeClass('selected-tool');
                selectedTool = null;
            }
        },
        onChange: function(oldPos, newPos) {
            $('#fenInput').val(Chessboard.objToFen(newPos));
        },
        onDrop: function(source, target) {
            if (target === 'offboard') {
                if (isDropOnTrash()) {
                    return 'trash';
                }
            }
        }
    };
    
    editorBoard = Chessboard('boardEditor', config);

    // --- LÓGICA DE INTERAÇÃO DO EDITOR ---

    $('.piece-palette img').draggable({
        helper: 'clone',
        revert: 'invalid',
        containment: 'document',
        appendTo: 'body'
    });

    $('#boardEditor').droppable({
        accept: '.piece-palette img',
        drop: function(event, ui) {
            const square = pixelToSquare(event.pageX, event.pageY);
            if (!square) return;

            const piece = ui.helper.data('piece');
            
            let currentPosition = editorBoard.position();
            currentPosition[square] = piece;
            editorBoard.position(currentPosition, false);
        }
    });

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

    $('#boardEditor').on('click', '.square-55d63, .piece-417db', function() {
        if (!selectedTool) return;

        const $square = $(this).hasClass('square-55d63') 
            ? $(this) 
            : $(this).closest('.square-55d63');
        
        const square = $square.data('square');
        if (!square) return;

        let currentPosition = editorBoard.position();

        if (selectedTool === 'delete') {
            delete currentPosition[square];
        } else {
            if (currentPosition[square] === selectedTool) {
                delete currentPosition[square];
            } else {
                currentPosition[square] = selectedTool;
            }
        }
        
        editorBoard.position(currentPosition, false);
    });

    // --- RESTANTE DAS FUNCIONALIDADES (sem alterações) ---
    
    function hidePgnControls() {
        gameHistory = [];
        currentMoveIndex = -1;
        $('#game-controls').fadeOut();
    }

    $('#clearBoardBtn').on('click', function() {
        editorBoard.clear(false);
        $('#fenInput').val(editorBoard.fen());
        hidePgnControls();
    });

    $('#startPosBtn').on('click', function() {
        editorBoard.start(false);
        hidePgnControls();
    });

    $('#flipBoardBtn').on('click', () => editorBoard.flip());
    $('#fenInput').on('change', () => editorBoard.position($('#fenInput').val()));

    function updateGameUI() {
        editorBoard.position(chess.fen());
        $('#fenInput').val(chess.fen());
        const moveNumber = Math.floor((currentMoveIndex + 1) / 2) + 1;
        const turn = currentMoveIndex === -1 ? "" : (chess.history({verbose: true})[currentMoveIndex].color === 'w' ? 'Brancas' : 'Pretas');
        const indicatorText = currentMoveIndex === -1 ? `Início` : `Lance ${moveNumber} (${turn})`;
        $('#move-indicator').text(`${indicatorText} | ${gameHistory.length} lances`);
    }
    
    $('#loadPgnBtn').on('click', function() {
        const pgn = $('#pgnInput').val();
        if (chess.load_pgn(pgn)) {
            gameHistory = chess.history();
            chess.reset();
            currentMoveIndex = -1;
            $('#game-controls').css('display', 'flex').hide().fadeIn();
            updateGameUI();
        } else {
            alert("PGN inválido ou não foi possível carregar a partida.");
            hidePgnControls();
        }
    });

    $('#btn-next').on('click', function() {
        if (currentMoveIndex < gameHistory.length - 1) {
            currentMoveIndex++;
            chess.move(gameHistory[currentMoveIndex]);
            updateGameUI();
        }
    });

    $('#btn-prev').on('click', function() {
        if (currentMoveIndex > -1) {
            chess.undo();
            currentMoveIndex--;
            updateGameUI();
        }
    });
    
    $('#btn-start').on('click', function() {
        if(gameHistory.length === 0) return;
        chess.reset();
        currentMoveIndex = -1;
        updateGameUI();
    });

    $('#btn-end').on('click', function() {
        if(gameHistory.length === 0) return;
        chess.load_pgn($('#pgnInput').val());
        currentMoveIndex = chess.history().length - 1;
        updateGameUI();
    });

    $('#addPositionBtn').on('click', function() {
        const fen = editorBoard.fen();
        const turn = $('input[name="turn"]:checked').val();
        const orientation = editorBoard.orientation();
        const puzzleId = 'puzzle-' + Date.now();
        const puzzleData = { id: puzzleId, fen, turn, orientation };
        puzzleList.push(puzzleData);

        if ($('#outputContainer .grid-container').length === 0) {
            const gridHtml = `<div class="grid-container"></div>`;
            $('#outputContainer').append(gridHtml);
            
            $('.grid-container').sortable({
                placeholder: "sortable-placeholder",
                cursor: "grabbing",
                update: function(event, ui) {
                    const newOrder = $(this).sortable('toArray', { attribute: 'data-id' });
                    puzzleList.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                }
            }).disableSelection();
        }
        
        const positionHtml = `
            <div class="position-wrapper" data-id="${puzzleId}">
                <button class="delete-btn" title="Remover Posição">X</button>
                <div class="position-board" id="board-${puzzleId}"></div>
                <div class="position-info">${turn}<br>_____________</div>
            </div>`;
        
        const newPuzzleElement = $(positionHtml);
        $('.grid-container').append(newPuzzleElement);

        Chessboard('board-' + puzzleId, {
            position: fen,
            orientation: orientation,
            showNotation: true,
            pieceTheme: pieceThemeUrl
        });
    });

    $('#outputContainer').on('click', '.delete-btn', function() {
        const puzzleWrapper = $(this).closest('.position-wrapper');
        const puzzleIdToRemove = puzzleWrapper.data('id');
        puzzleList = puzzleList.filter(p => p.id !== puzzleIdToRemove);
        puzzleWrapper.fadeOut(300, function() { $(this).remove(); });
    });

    $('#clearAllBtn').on('click', function() {
        $('#outputContainer').empty();
        puzzleList = [];
        editorBoard.start();
        hidePgnControls();
    });

    $('#exportImgBtn').on('click', function() {
        if ($('.grid-container').length === 0) { return; }
        const container = $(".grid-container")[0];
        const originalBg = container.style.backgroundColor;
        container.style.backgroundColor = '#222';

        html2canvas(container, { useCORS: true, scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'puzzles_xadrez.png';
            link.click();
            container.style.backgroundColor = originalBg;
        });
    });

    $('#exportPdfBtn').on('click', async function() {
        if (puzzleList.length === 0) { return; }

        const exportButton = $(this);
        exportButton.prop('disabled', true).text('Gerando PDF...');
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const useWhiteBg = $('#whiteBgExport').is(':checked');
        const puzzlesPerPage = 6;
        const margin = 10;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const gap = 8;
        const puzzleSize = (pageWidth - (margin * 2) - gap) / 2;
        const infoHeight = 15;
        const totalPuzzleHeight = puzzleSize + infoHeight;

        const positions = [
            { x: margin, y: margin }, 
            { x: margin, y: margin + totalPuzzleHeight }, 
            { x: margin, y: margin + (totalPuzzleHeight * 2) },
            { x: margin + puzzleSize + gap, y: margin }, 
            { x: margin + puzzleSize + gap, y: margin + totalPuzzleHeight },
            { x: margin + puzzleSize + gap, y: margin + (totalPuzzleHeight * 2) }
        ];

        for (let i = 0; i < puzzleList.length; i++) {
            const pageIndex = Math.floor(i / puzzlesPerPage);
            if (i > 0 && (i % puzzlesPerPage === 0)) {
                pdf.addPage();
            }

            const puzzle = puzzleList[i];
            const pos = positions[i % puzzlesPerPage];
            
            const tempId = `temp-board-${i}`;
            const tempDiv = $(`<div id="${tempId}" class="hidden-board-for-export" style="width: ${puzzleSize * 4}px; height: ${puzzleSize * 4}px;"></div>`);
            if (useWhiteBg) { tempDiv.addClass('export-white-bg'); }
            $('body').append(tempDiv);
            
            const tempBoardElement = document.getElementById(tempId);
            Chessboard(tempBoardElement, { 
                position: puzzle.fen, 
                orientation: puzzle.orientation, 
                pieceTheme: pieceThemeUrl 
            });

            const canvas = await html2canvas(tempBoardElement, { 
                scale: 2,
                backgroundColor: useWhiteBg ? '#FFFFFF' : null
            });

            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', pos.x, pos.y, puzzleSize, puzzleSize);

            pdf.setFontSize(11);
            pdf.setTextColor(useWhiteBg ? '#000000' : '#FFFFFF');
            pdf.text(`Jogam as ${puzzle.turn}: _________________`, pos.x, pos.y + puzzleSize + 10);

            tempDiv.remove();
        }

        pdf.save('taticos_xadrez.pdf');
        exportButton.prop('disabled', false).text('Exportar para PDF');
    });
});