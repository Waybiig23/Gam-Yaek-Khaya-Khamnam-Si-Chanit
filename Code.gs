function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('เกมคุ้ยขยะแยกคำนาม ๔ ชนิด')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
