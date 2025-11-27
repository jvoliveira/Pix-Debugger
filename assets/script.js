const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewImage = document.getElementById('previewImage');
const pixInput = document.getElementById('pixInput');
const jsonOutput = document.getElementById('jsonOutput');
const processBtn = document.getElementById('processBtn');
const pasteIndicator = document.getElementById('pasteIndicator');

let imageData = null;

// Evento de colar para toda a página
document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            handleFile(blob);

            // Mostrar indicador de sucesso
            pasteIndicator.classList.add('show');
            setTimeout(() => {
                pasteIndicator.classList.remove('show');
            }, 3000);

            break;
        }
    }
});

// Click para abrir seletor de arquivo
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// Arrastar e soltar
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Seleção de arquivo
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem válida.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        imageData = {
            name: file.name,
            type: file.type,
            size: file.size,
            base64: e.target.result
        };

        previewImage.onload = async () => {
            const qr = await decodeQRFromImage(previewImage);

            if (qr) {
                pixInput.value = qr;
                console.log("PIX encontrado:", qr);
            } else {
                console.warn("Nenhum QR detectado.");
            }
        };

        previewImage.src = e.target.result;
        previewImage.style.display = 'block';

    };
    reader.readAsDataURL(file);
}

// Processar dados
processBtn.addEventListener('click', async () => {
    const copiaECola = pixInput.value.trim();
    const urlDoPayload = getPixUrl(copiaECola);

    console.log("URL:", urlDoPayload);

    const jwt = await fetchJwtContent(urlDoPayload);

    console.log("Conteúdo do JWT:", jwt);

    const data = decodeJwt(jwt);
    console.log(data.payload);

    jsonOutput.innerHTML = JSON.stringify(data.payload, null, 2);
    hljs.highlightAll();
});

// Limpar preview ao mudar PIX
pixInput.addEventListener('input', () => {
    if (pixInput.value.trim()) {
    }
});

async function decodeQRFromImage(imgEl) {
    return new Promise((resolve) => {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');

        c.width = imgEl.naturalWidth;
        c.height = imgEl.naturalHeight;

        ctx.drawImage(imgEl, 0, 0);

        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const result = jsQR(imgData.data, imgData.width, imgData.height);

        resolve(result ? result.data : null);
    });
}

function decodeTLV(str) {
    const result = {};
    let i = 0;

    while (i < str.length) {
        const tag = str.substring(i, i + 2);
        const len = parseInt(str.substring(i + 2, i + 4), 10);
        const value = str.substring(i + 4, i + 4 + len);

        result[tag] = value;
        i += 4 + len;
    }

    return result;
}

function getPixUrl(payload) {
    if (!payload) return null;

    const root = decodeTLV(payload);

    for (let t = 26; t <= 51; t++) {
        const tag = String(t).padStart(2, "0");

        if (root[tag]) {
            const nested = decodeTLV(root[tag]);

            if (nested["25"]) {
                return nested["25"];
            }
        }
    }

    return null;
}

async function fetchJwtContent(url) {
    try {
        const resp = await fetch(`https://${url}`, { method: "GET" });

        if (!resp.ok) {
            throw new Error("HTTP " + resp.status);
        }

        const text = await resp.text();
        return text;
    } catch (err) {
        console.error("Erro ao buscar JWT:", err);
        return null;
    }
}

function decodeJwt(jwt) {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;

    const decode = (str) =>
        JSON.parse(atob(str.replace(/-/g, "+").replace(/_/g, "/")));

    return {
        header: decode(parts[0]),
        payload: decode(parts[1]),
        signature: parts[2]
    };
}

