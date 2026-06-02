document.addEventListener('DOMContentLoaded', function(){
  var btn = document.getElementById('btnCapture');
  if(btn){
    btn.addEventListener('click', async function(){
      var table = document.getElementById('tblStandings');
      if(!table){ alert('Không tìm thấy bảng xếp hạng'); return; }
      
      btn.textContent = 'Đang chụp...';
      
      try {
        const canvas = await html2canvas(table, {backgroundColor: '#0b1020', scale:2});
        
        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          try {
            // Check if File System Access API is supported
            if ('showSaveFilePicker' in window) {
              // Use File System Access API for Windows Explorer dialog
              const fileHandle = await window.showSaveFilePicker({
                suggestedName: 'standings_snapshot.png',
                types: [{
                  description: 'PNG Images',
                  accept: {
                    'image/png': ['.png']
                  }
                }]
              });
              
              const writable = await fileHandle.createWritable();
              await writable.write(blob);
              await writable.close();
              
              alert('Đã lưu ảnh BXH thành công!');
            } else {
              // Fallback for browsers that don't support File System Access API
              var link = document.createElement('a');
              link.download = 'standings_snapshot.png';
              link.href = URL.createObjectURL(blob);
              link.click();
              URL.revokeObjectURL(link.href);
            }
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error('Save error:', error);
              alert('Lỗi khi lưu file: ' + error.message);
            }
          }
          btn.textContent = '📸 Chụp BXH';
        }, 'image/png');
        
      } catch(err) {
        console.error(err);
        alert('Lỗi khi chụp ảnh BXH');
        btn.textContent = '📸 Chụp BXH';
      }
    });
  }
});
