# Underwater Imaging · Thalassa

A local underwater image enhancement project with an interactive WebGL website, prepared before/after examples, image upload and a notebook workflow for training and evaluation.

![Thalassa prepared comparison](demo/samples/U45.png)

> **Bắt đầu ở đây:** clone → cài Python 3.10 → chọn Anaconda hoặc venv → cài `requirements.txt` → chạy `python web/server.py`. Checkpoint UIEB và ảnh demo đã có trong repo. Dataset/URanker chỉ cần tải khi train hoặc đánh giá tương ứng.

## Features

- Đại dương WebGL, gallery có sẵn 5 cảnh và các kết quả ở cap 256/512/768 px.
- Compare, side-by-side, ảnh riêng, zoom và sơ đồ kiến trúc đầy đủ.
- Khu **Your Upload** độc lập: JPG/PNG/WEBP, tối đa 20 MB, chấp nhận ảnh ngoài dataset và không cần ground truth.
- Chọn pretrained UIEB hoặc best checkpoint của lượt tự train hiện tại.
- `TRAIN_ALL.ipynb`: train từ khởi tạo ngẫu nhiên, validation theo từng bộ, biểu đồ, ảnh preview, checkpoint và held-out test.
- Mã xử lý ảnh nằm trong notebook; web và notebook dùng chung mã qua `.runtime/`.

## Requirements

Hướng dẫn dưới đây dành cho **Windows 10/11, Python 3.10 64-bit**, dùng Anaconda hoặc Python/venv. Chỉ chọn một trong hai cách.

| Thành phần | Web demo | Training |
|---|---|---|
| Python 3.10 và `requirements.txt` | Cần | Cần |
| GPU NVIDIA/CUDA hoạt động | Có thể dùng CPU | Cần cho notebook hiện tại |
| VS Code + Python/Jupyter extensions | Không bắt buộc | Để chạy/xem cell |
| Dataset | Không cần | Cần tải và giải nén |
| Git | Để clone | Để clone |
| Node 22+ và Chrome/Edge | Chỉ khi chạy browser smoke check | Không cần |

PyTorch trong `requirements.txt` là `2.4.0+cu118`, torchvision `0.19.0+cu118`. CPU vẫn chạy được inference bằng wheel này; train hiện dùng CUDA. Các package trực tiếp được ghim phiên bản; không có requirements riêng cho từng chức năng.

## 1. Clone

Trong terminal:

```bat
git clone https://github.com/chudu2110/UNDERWATER-IMAGING.git
cd UNDERWATER-IMAGING
```

Các lệnh bên dưới đều chạy từ thư mục này. Kiểm tra model dùng baseline notebook đi kèm, không cần lịch sử commit của repo nguồn.

## 2A. Setup with Anaconda

Mở **Anaconda Prompt**:

```bat
conda create -n demo python=3.10 pip -y
conda activate demo
python -m pip install -r requirements.txt
python -m pip check
python -m ipykernel install --user --name demo --display-name "Python (demo)"
```

Mỗi lần mở terminal mới để chạy dự án:

```bat
conda activate demo
cd path\to\UNDERWATER-IMAGING
```

## 2B. Setup without Anaconda

Cài **Python 3.10 64-bit** và Git. Trong Command Prompt tại thư mục dự án:

```bat
py -3.10 -m venv .venv
.venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip check
python -m ipykernel install --user --name demo --display-name "Python (demo)"
```

Nếu dùng PowerShell, có thể gọi interpreter trực tiếp, không cần thay đổi execution policy:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m ipykernel install --user --name demo --display-name "Python (demo)"
.\.venv\Scripts\python.exe web/server.py
```

Các lệnh `python ...` ở các phần sau giả định bạn đã activate đúng môi trường; nếu chưa activate, thay `python` bằng `.venv\Scripts\python.exe`.

## 3. Run the Web Demo

Trong terminal có môi trường đã chọn:

```bat
set DEMO_DEVICE=cpu
python web/server.py
```

PowerShell tương đương:

```powershell
$env:DEMO_DEVICE = "cpu"
python web/server.py
```

Mở **http://127.0.0.1:7860/**. Giữ terminal này chạy; Ctrl+C để dừng.

1. **Explore**: chọn ảnh mẫu; kết quả đã tạo sẵn, không cần submit. Chọn cap 256/512/768, view mode, zoom hoặc Expand. Ảnh nguồn là 640×480 nên cap 768 không phóng ảnh lớn hơn nguồn.
2. **Inside the Network**: xem sơ đồ gốc, mở full diagram và đọc giải thích các khối.
3. **Your Upload**: chọn ảnh của bạn, output size và model rồi bấm **Enhance your image**. Kéo thanh so sánh và tải PNG kết quả.
4. **Training**: xem trạng thái nếu đang có lượt train trên máy này.

**Pretrained · UIEB** chạy ngay bằng `checkpoints/UIEB.pth` đã kèm repo. **Trained model** chỉ mở khi run hiện tại có `best_model.pth` sau validation. Gallery luôn là các kết quả pretrained đã chuẩn bị; không phải kết quả của lượt đang train.

Web dùng CPU khi train để dành VRAM cho notebook. Nếu không train, có thể đặt `DEMO_DEVICE=cuda` trước khi khởi động server. Model nạp khi server bắt đầu; thay device cần restart server.

## 4. Download Data and Evaluation Weights

Repo chứa code, notebook, web, checkpoint demo, CIDNet, tham số NIQE và ảnh minh họa. **Không đưa dataset, URanker, VGG16 cache, môi trường Python, log hoặc checkpoint đang train vào Git.** Đây là các tài nguyên ngoài mã nguồn, tải/khởi tạo bằng các bước dưới đây.

| Resource | Download / local path |
|---|---|
| Dataset ZIP | [Google Drive](https://drive.google.com/file/d/1ceeWdqRdiIortVTSH0UNTZamHdMsZ3aA/view) → `downloads/UnderWaterDataset.zip` |
| UIEB pretrained | Đã kèm tại `checkpoints/UIEB.pth`; nguồn [Google Drive](https://drive.google.com/file/d/1c80kkDbgpLD1MtqVLql1Y1NQVD7IzxiO/view) |
| URanker (~259 MB) | [Google Drive](https://drive.google.com/file/d/1vBmD3ZvgVtz8xBTh3UmHGO72cAwlLG7G/view) → `utils/uranker/URanker_ckpt.pth` |
| CIDNet | Đã kèm tại `utils/CIDNet_weight_LOLv2_bestSSIM.pth` |
| VGG16 for loss | Torchvision tải khi khởi tạo perceptual loss; notebook đặt cache tại `downloads/torch/` |

Tải dataset tự động:

```bat
python .runtime/download_assets.py --asset dataset
python .runtime/prepare_data.py
```

`prepare_data` kiểm tra CRC ZIP, dung lượng trống, đường dẫn giải nén và tên input/GT, rồi ghi `downloads/dataset_inventory.json`. Dataset đã giải nén hiện khoảng 2,65 GB; cần thêm chỗ cho ZIP, môi trường, cache VGG16 và checkpoint của từng run.

Nếu cần đánh giá không tham chiếu bằng URanker:

```bat
python .runtime/download_assets.py --asset ranker
```

Có thể tải cả ba mục Drive bằng `python .runtime/download_assets.py`. Nếu Drive bị quota hoặc tải tự động không được, tải thủ công theo liên kết và đặt đúng đường dẫn ở bảng trên. Không đổi cấu trúc bên trong ZIP.

Nếu đã giải nén bằng tay, đặt các thư mục dataset trực tiếp dưới `UnderWaterDataset/`:

```text
UnderWaterDataset/
├── EUVP-Dark/{train,val,test}/{input,GT}/
├── EUVP-Scene/{train,val,test}/{input,GT}/
├── LSUI/{train,val,test}/{input,GT}/
├── UFO-120/{train,val,test}/{input,GT}/
├── UIEB/{train,val,test}/{input,GT}/
├── Challenging-60/test/
├── EUVP/test/
└── U45/test/
```

Các file input và GT phải khớp tên. Bộ thiếu GT chỉ dành cho đánh giá không tham chiếu, không dùng trong supervised loss.

## 5. Train from Scratch in VS Code

1. Cài VS Code extensions **Python** và **Jupyter**; mở cả folder dự án.
2. Mở `TRAIN_ALL.ipynb`, bấm **Select Kernel**, chọn interpreter thuộc môi trường vừa cài hoặc kernel **Python (demo)**. Kernel này dùng được cho cả Anaconda và venv; nếu đổi môi trường, đăng ký lại kernel từ interpreter mới.
3. Chạy cell **Environment** để kiểm tra CUDA. Training hiện tại yêu cầu GPU; CPU chỉ dùng cho web/inference.
4. Đọc và chỉnh cell **Configuration** trước khi chạy: mặc định 100 epoch, batch 4, tích lũy 6 bước, ảnh 256×256, seed 7.
5. Chạy từ trên xuống bằng từng cell hoặc **Run All**. Notebook tự tạo run mới, không resume model cũ.
6. Sau cell **Training**, chạy **Test** để đánh giá best checkpoint trên test split giữ riêng. Nhấn **Ctrl+S** lưu code và output.

Train dùng cả năm bộ có input–GT. Notebook phát hiện input trùng byte giữa split và loại theo ưu tiên giữ test. Với dataset hiện tại, số cặp sau loại trùng là 11.089 train / 1.550 validation / 1.411 test; manifest của run là nguồn đối chiếu chính xác.

Biểu đồ và ảnh preview cập nhật sau mỗi epoch và validation. Trước khi xong epoch đầu, chỉ có tiến trình batch/loss. Chạy toàn bộ có thể mất nhiều ngày trên GPU laptop 4 GB; thời gian tùy máy. Không sleep/tắt máy trong lúc train, không chạy hai lượt cùng lúc.

Mô hình chính khởi tạo ngẫu nhiên. VGG16/CIDNet trong loss dùng pretrained như phương pháp gốc; chúng không phải trọng số khởi tạo model chính. Checkpoint trạng thái lưu cuối epoch nhưng notebook hiện **không tự resume**.

## 6. Results and Switching Models

```text
output/
├── training_status.json
└── demo/ALL/notebook_TIMESTAMP/
    ├── config.json
    ├── data_manifest.csv
    ├── excluded_cross_split_duplicates.csv
    ├── initial_model.pth
    ├── history.csv
    ├── curves.png
    ├── latest_preview.png
    ├── best_model.pth
    ├── last_model.pth
    ├── last_checkpoint.pth
    └── test_results.csv
```

- Validation chọn best checkpoint bằng macro PSNR của năm bộ.
- Test chỉ chạy sau khi xong train, dùng best checkpoint của run đó.
- `training_complete`: vòng train xong, test còn pending. `complete`: cell test cũng đã hoàn tất.
- Web đọc `output/training_status.json` để tìm `run_path` và best checkpoint. Khi có, chọn **Trained model** trong Your Upload rồi xử lý lại ảnh; không cần thay code.
- Muốn đem model tự train sang máy khác, chép `best_model.pth` vào một run dưới `output/` và chép/chỉnh `training_status.json` để `run_path` trỏ tới đúng thư mục đó (đường dẫn tương đối với root dự án).

Không dùng ảnh gallery hoặc checkpoint pretrained làm kết quả nghiệm thu lượt train mới. Repo không đóng gói một run chưa hoàn tất thành kết quả cuối cùng. Bản `TRAIN_ALL.ipynb` trên Git được xóa output để người clone chạy lượt của mình; output thật của lượt đang chạy trên máy phát triển vẫn được giữ cục bộ.

## 7. File Map

| File / directory | Purpose |
|---|---|
| `TRAIN_ALL.ipynb` | Workflow train/validation/test từng bước |
| `PROJECT.ipynb` | Danh mục module và kiểm tra tính toàn vẹn/tương đương |
| `model.ipynb` | Kiến trúc `myModel` dùng chung |
| `train.ipynb`, `test.ipynb`, `test_nr.ipynb` | Module train, paired test, non-reference test |
| `download_assets.ipynb`, `prepare_data.ipynb` | Tải/kiểm kê/giải nén dữ liệu |
| `utils/*.ipynb`, `utils/uranker/` | Dataset, preprocessing, loss, metric và mạng phụ trợ |
| `web/` | Backend, HTML/CSS/JS, WebGL và gallery kết quả tạo sẵn |
| `.runtime/` | Import bridges và loader thực thi mã notebook; phải giữ khi clone |
| `notebooks/source_manifest.json` | Ánh xạ module, hash và thay đổi được ghi nhận |
| `notebooks/model_reference.ipynb` | Baseline gốc cho kiểm tra số học, có hash và thông tin nguồn; không cần lịch sử upstream |
| `scripts/*.ipynb` | Công cụ bảo trì/tạo/chạy notebook, không cần cho lượt train thủ công |
| `check_demo.ipynb`, `check_training.ipynb`, `tests/` | Smoke checks và file-write tests |
| `check_web.mjs`, `.agents/` | Browser smoke check và công cụ phát triển giao diện |
| `requirements.txt` | Dependency Python duy nhất |
| `instruction.md` | Bản đồ chi tiết vai trò từng module, API và thư mục |
| `logs/dev/`, `logs/runtime/`, `logs/training/` | Log/QA tạm và log tiến trình, được bỏ qua bởi Git |

**Không sửa các bridge thay cho thuật toán.** Sửa code trong notebook tương ứng. Không chạy script tạo lại notebook khi đang train hoặc có output chưa lưu. `.runtime/` bị ẩn trong VS Code Explorer nhưng vẫn nằm trong repo và cần thiết cho web.

## 8. Optional Checks

Kiểm tra dependency và syntax:

```bat
python -m pip check
node --check web/studio.js
node --check web/ocean.js
```

Khi web đang chạy và đã cài Node 22+/Chrome hoặc Edge:

```bat
node check_web.mjs
```

Ảnh chụp QA nằm ở `logs/dev/design-qa/qa/`. `PROJECT.ipynb` kiểm tra nguồn/mô hình; nên chạy khi GPU rảnh. `check_training.ipynb` có thể tạo một run kiểm thử nhỏ và cập nhật status, nên không chạy nó đồng thời với train thật. Không cần chạy checks để sử dụng web thông thường.

## 9. Troubleshooting

| Problem | Action |
|---|---|
| `ModuleNotFoundError` | Kiểm tra `python -c "import sys; print(sys.executable)"`, activate đúng môi trường, cài lại `requirements.txt` trong môi trường đó. |
| Notebook không thấy `demo` | Đăng ký lại `ipykernel` từ interpreter đúng rồi chọn kernel trong VS Code. |
| `CUDA is not available` | Kiểm tra driver NVIDIA và đúng PyTorch CUDA/interpreter. Web vẫn chạy bằng CPU; notebook train yêu cầu CUDA. |
| CUDA out of memory | Dừng các tác vụ GPU không cần thiết, dùng CPU cho web; giảm batch trong Configuration trước lượt mới và giữ effective batch chia hết cho batch. |
| Cổng 7860 đã dùng | Dừng server cũ bằng Ctrl+C trước khi mở lượt mới. |
| Không có biểu đồ ở epoch đầu | Chờ epoch và validation hoàn tất; xem tiến trình batch dưới cell Training. |
| Output notebook chưa cập nhật | Khi dùng runner tự động, đóng/mở lại tab để đọc file đã lưu. Không lưu đè tab cũ lên file đang được runner ghi. |
| Gallery không giống model mới | Gallery dùng kết quả pretrained tạo sẵn. Dùng Your Upload với Trained model để thử checkpoint mới. |
| Thiếu dataset/trọng số | Làm phần Download Data; không cần tải dataset để chỉ chạy web. |
| WebGL không có hình | Reload trang, bật hardware acceleration nếu browser hỗ trợ; nền tĩnh vẫn hiển thị khi WebGL không khả dụng. |

Với lỗi cụ thể `libomp140.x86_64.dll` trên Windows: môi trường Anaconda đã dùng LLVM OpenMP 14. Trong Anaconda Prompt:

```bat
conda install -y https://conda.anaconda.org/conda-forge/win-64/llvm-openmp-14.0.0-h2d74725_0.tar.bz2
copy "%CONDA_PREFIX%\Library\bin\libomp.dll" "%CONDA_PREFIX%\Library\bin\libomp140.x86_64.dll"
```

Với venv đang activate, có thể lấy đúng DLL từ cùng gói conda-forge mà không cần cài Anaconda. Chỉ thực hiện nếu gặp lỗi thiếu `libomp140.x86_64.dll`:

```bat
curl.exe -L "https://conda.anaconda.org/conda-forge/win-64/llvm-openmp-14.0.0-h2d74725_0.tar.bz2" -o "%TEMP%\demo-openmp.tar.bz2"
python -c "import os,sys,tarfile; from pathlib import Path; archive=tarfile.open(Path(os.environ['TEMP'])/'demo-openmp.tar.bz2'); data=archive.extractfile('Library/bin/libomp.dll').read(); target=Path(sys.prefix)/'Lib/site-packages/torch/lib/libomp140.x86_64.dll'; target.write_bytes(data); print(target)"
```

Lệnh chỉ đọc đúng member DLL trong archive và ghi vào thư viện torch của môi trường đang activate. Không cần giải nén toàn bộ gói hoặc cài một môi trường Python khác.

## Repository Ownership

Đây là repository độc lập do **chudu2110** quản lý. Nhánh `main` bắt đầu bằng một initial commit mới; không nhập lịch sử commit của dự án nguồn. Thêm người cộng tác tại **Settings → Collaborators → Add people**. GitHub tự tính danh sách Contributors từ tác giả commit, không thêm thủ công tại danh sách đó.

## Attribution and License

Dự án dựa trên [WWE-UIE](https://github.com/chingheng0808/WWE-UIE), *A Wavelet & White Balance Efficient Network for Underwater Image Enhancement*, Ching-Heng Cheng, Jen-Wei Lee, Chia-Ming Lee và Chih-Chung Hsu. [Paper](https://arxiv.org/abs/2511.16321).

Giữ giấy phép Apache-2.0 trong [LICENSE](LICENSE). Kiến trúc, checkpoint và demo assets có nguồn từ repo gốc; Thalassa bổ sung notebook workflow, runtime compatibility, kiểm kê dữ liệu và giao diện web. Các bộ dữ liệu/trọng số tải ngoài cần được sử dụng theo điều kiện của nguồn cung cấp.
