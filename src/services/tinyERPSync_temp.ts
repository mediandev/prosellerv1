// Temporary file to help with edit
  private escaparXML(texto: any): string {
    if (texto === undefined || texto === null || texto === '') {
      return '';
    }
    return String(texto)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
