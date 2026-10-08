interface DriveUploadResult { id: string; name: string; mimeType: string; webViewLink?: string }
const CHUNK = 8 * 1024 * 1024;
const put = (url: string, blob: Blob | null, range: string, progress: (bytes: number) => void) =>
  new Promise<{ status: number; range: string | null; text: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Range', range);
    if (blob) xhr.setRequestHeader('Content-Type', blob.type);
    xhr.upload.onprogress = event => progress(event.loaded);
    xhr.onload = () => resolve({ status: xhr.status, range: xhr.getResponseHeader('Range'), text: xhr.responseText });
    xhr.onerror = () => reject(new Error('Conexão interrompida durante o envio.'));
    xhr.send(blob);
  });

export async function uploadToDrive(url: string, file: File, progress: (fraction: number) => void): Promise<DriveUploadResult> {
  let offset = 0;
  let failures = 0;
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK, file.size);
    let response;
    try {
      response = await put(url, file.slice(offset, end, file.type), `bytes ${offset}-${end - 1}/${file.size}`, bytes => progress((offset + bytes) / file.size));
      if (response.status >= 500 || response.status === 429) throw new Error('Envio temporariamente indisponível.');
    } catch (error) {
      if (++failures > 3) throw error;
      await new Promise(resolve => setTimeout(resolve, failures * 1000));
      response = await put(url, null, `bytes */${file.size}`, () => {});
    }
    if (response.status === 200 || response.status === 201) {
      const result = JSON.parse(response.text) as DriveUploadResult;
      if (!result.id) throw new Error('O Google não confirmou o arquivo.');
      progress(1);
      return result;
    }
    if (response.status !== 308) throw new Error(`Não foi possível enviar o arquivo (${response.status}).`);
    const match = response.range?.match(/bytes=0-(\d+)/);
    const next = match ? Number(match[1]) + 1 : 0;
    if (next <= offset && ++failures > 3) throw new Error('O envio não avançou. Tente novamente.');
    offset = next;
  }
  throw new Error('O Google não confirmou o fim do envio.');
}