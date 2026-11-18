/** web build only: the browser has its own pdf viewer */
export default function PdfView({ uri }: { uri: string; onPages?: (page: number, total: number) => void }) {
  return <iframe src={uri} title="pdf" style={{ border: 0, width: '100%', height: '100%', background: '#efefec' }} />;
}
