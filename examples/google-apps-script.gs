/**
 * InstantHost Google Apps Script Example
 * 
 * This script exports a Google Sheet as an HTML table and publishes it instantly.
 */

function publishSheetToWeb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  let html = '<html><head><style>table { border-collapse: collapse; } td, th { border: 1px solid #ccc; padding: 8px; }</style></head><body>';
  html += '<h1>' + sheet.getName() + '</h1><table>';
  
  data.forEach((row, rowIndex) => {
    html += '<tr>';
    row.forEach(cell => {
      const tag = rowIndex === 0 ? 'th' : 'td';
      html += '<' + tag + '>' + cell + '</' + tag + '>';
    });
    html += '</tr>';
  });
  
  html += '</table></body></html>';
  
  const payload = {
    files: [{
      path: 'index.html',
      size: html.length,
      contentType: 'text/html'
    }]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  // Step 1: Create Publish
  const response = UrlFetchApp.fetch('https://instanthost.site/api/v1/publish', options);
  const result = JSON.parse(response.getContentText());
  
  if (result.error) {
    Logger.log('Error: ' + result.error);
    return;
  }
  
  // Step 2: Upload File (Directly using PUT to presigned URL)
  const uploadUrl = result.uploads[0].url;
  const uploadOptions = {
    method: 'put',
    contentType: 'text/html',
    payload: html
  };
  UrlFetchApp.fetch(uploadUrl, uploadOptions);
  
  // Step 3: Finalize
  const finalizeOptions = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ versionId: result.versionId })
  };
  UrlFetchApp.fetch(result.finalizeUrl, finalizeOptions);
  
  Logger.log('Published at: ' + result.siteUrl);
  SpreadsheetApp.getUi().alert('Published at: ' + result.siteUrl);
}
