# Metrakys

O certificado FARO é apresentado a partir de `laser-tracker-faro.pdf`. A impressão usa
`laser-tracker-faro-print.png`, pois navegadores não imprimem corretamente o PDF
incorporado. Ao atualizar o PDF, atualize também a imagem de impressão. Com PyMuPDF
instalado, execute na raiz do repositório:

```sh
python -c "import pymupdf; d=pymupdf.open('laser-tracker-faro.pdf'); assert len(d)==1; d[0].get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), alpha=False).save('laser-tracker-faro-print.png')"
```