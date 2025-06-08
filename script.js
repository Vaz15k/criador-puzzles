$(document).ready(function() {
    let editorBoard = null;
    let positionCounter = 0;
    let currentPage = null;
    let pageCounter = 0;
    const POSITIONS_PER_PAGE = 16;
    
    let puzzleList = [];

    const pieceThemeUrl = 'img/chesspieces/default/{piece}.png';

    function onBoardChange(oldPos, newPos) {
        $('#fenInput').val(editorBoard.fen());
    }

    const config = {
        draggable: true,
        position: 'start',
        showNotation: true,
        pieceTheme: pieceThemeUrl,
        onChange: onBoardChange,
        onSnapEnd: onBoardChange
    };
    editorBoard = Chessboard('boardEditor', config);
    $('#fenInput').val(editorBoard.fen());

    $('#fenInput').on('change', function() {
        editorBoard.position($(this).val());
    });
    
    $('#addPositionBtn').on('click', function() {
        const fen = editorBoard.fen();
        const turn = $('input[name="turn"]:checked').val();
        puzzleList.push({ fen, turn });

        if (positionCounter % POSITIONS_PER_PAGE === 0) {
            pageCounter++;
            const pageHtml = `<div class="page" id="page-${pageCounter}"><h2>Página ${pageCounter}</h2><div class="grid-container"></div></div>`;
            $('#outputContainer').append(pageHtml);
            currentPage = $(`#page-${pageCounter} .grid-container`);
        }
        
        const positionId = `pos-${positionCounter}`;
        const positionHtml = `
            <div class="position-wrapper">
                <div class="position-board" id="${positionId}"></div>
                <div class="position-info">${turn}<br>_____________</div>
            </div>`;
        currentPage.append(positionHtml);

        const boardElement = document.getElementById(positionId);
        if (boardElement) {
            Chessboard(boardElement, {
                position: fen,
                showNotation: true,
                pieceTheme: pieceThemeUrl
            });
        } else {
            console.error("Erro: Elemento do tabuleiro não encontrado na grade visual: #" + positionId);
        }

        positionCounter++;
    });

    $('#clearAllBtn').on('click', function() {
        $('#outputContainer').empty();
        puzzleList = [];
        positionCounter = 0;
        pageCounter = 0;
        currentPage = null;
        editorBoard.start();
        $('#fenInput').val(editorBoard.fen());
        alert('Tudo foi limpo!');
    });

    $('#exportImgBtn').on('click', function() {
        if(puzzleList.length === 0) {
            alert("Adicione pelo menos uma posição antes de exportar.");
            return;
        }
        alert("A exportação da imagem será iniciada...");
        html2canvas(document.querySelector("#outputContainer")).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'puzzles_xadrez.png';
            link.click();
        });
    });

    $('#exportPdfBtn').on('click', async function() {
        if (puzzleList.length === 0) {
            alert("Adicione pelo menos uma posição antes de exportar.");
            return;
        }

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
            const indexOnPage = i % puzzlesPerPage;
            if (i > 0 && indexOnPage === 0) {
                pdf.addPage();
            }

            const puzzle = puzzleList[i];
            const pos = positions[indexOnPage];
            
            const tempId = `temp-board-${i}`;
            const tempDiv = $(`<div id="${tempId}" class="hidden-board-for-export"></div>`);
            if (useWhiteBg) {
                tempDiv.addClass('export-white-bg');
            }
            $('body').append(tempDiv);
            
            const tempBoardElement = document.getElementById(tempId);
            if (tempBoardElement) {
                Chessboard(tempBoardElement, { 
                    position: puzzle.fen, 
                    pieceTheme: pieceThemeUrl
                });

                const canvas = await html2canvas(tempBoardElement, { 
                    backgroundColor: useWhiteBg ? '#FFFFFF' : '#333333'
                });
                const imgData = canvas.toDataURL('image/png');

                pdf.addImage(imgData, 'PNG', pos.x, pos.y, puzzleSize, puzzleSize);
                pdf.setFontSize(12);
                pdf.text(`${puzzle.turn}: _______________________`, pos.x, pos.y + puzzleSize + 8);
            } else {
                console.error("Erro: Elemento do tabuleiro temporário não encontrado: #" + tempId);
            }
            
            tempDiv.remove();
        }

        pdf.save('taticos_xadrez.pdf');
        exportButton.prop('disabled', false).text('Exportar para PDF');
    });
});