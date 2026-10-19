# Project Instructions

Dự án tăng cường ảnh dưới nước, gồm pipeline train/test bằng notebook và web demo Thalassa. File này là hướng dẫn chung về cấu trúc, vai trò các file, môi trường và cách chạy.

## 1. System Overview

```text
UnderWaterDataset/
       │
       ▼
TRAIN_ALL.ipynb ──► utils/dataset.ipynb ──► model.ipynb
       │                                      │
       │                     utils/loss_funcs.ipynb + CIDNet/VGG
       │                                      │
       ├── validation ◄──── utils/metrics.ipynb ◄┘
       │
       ▼
output/demo/ALL/notebook_TIMESTAMP/
       ├── best_model.pth ──► test split ──► test_results.csv
       └── best_model.pth ──► web/server.py ──► web/app.py
                                    │
                              web/index.html
                              studio.js + ocean.js + style.css
                              web/examples/ (prepared results)
```

- **Train**: học trên các cặp ảnh input–GT của năm bộ dữ liệu. Mô hình chính khởi tạo ngẫu nhiên; VGG16/CIDNet cung cấp đặc trưng pretrained cho loss.
- **Validation**: chọn checkpoint theo macro PSNR của năm bộ, mỗi bộ có trọng số ngang nhau trong macro mean.
- **Test**: đánh giá checkpoint tốt nhất trên test split giữ riêng sau khi train kết thúc.
- **Web demo**: nhận ảnh, chạy inference và trả PNG. Có hai lựa chọn trọng số: UIEB tải sẵn hoặc checkpoint của lượt tự train hiện tại.

## 2. Project Structure

### Main Notebooks

| File | Vai trò |
|---|---|
| `TRAIN_ALL.ipynb` | Quy trình chính: cấu hình, kiểm kê, loại trùng, DataLoader, model, loss, backward check, train, validation, test và biểu đồ. Đây là notebook để chạy train toàn bộ. |
| `PROJECT.ipynb` | Danh mục module; kiểm tra hash nguồn và đối chiếu đầu ra model với mã gốc trên cùng input/trọng số. Không thực hiện một lượt train. |
| `model.ipynb` | Định nghĩa `myModel`, kiến trúc xử lý ảnh và white balance. Train, test và web dùng chung model này. |
| `train.ipynb` | `Trainer`, vòng train theo từng dataset, seed, ghi file/checkpoint và hàm `replace_with_retry`. Notebook chính dùng một số tiện ích ở đây nhưng tự triển khai vòng train nhiều dataset. |
| `test.ipynb` | `Tester` cho ảnh có GT: PSNR, SSIM, lưu ảnh dự đoán, thống kê FLOPs và số tham số. |
| `test_nr.ipynb` | `Tester` cho ảnh thiếu GT: NIQE, UCIQE, URanker; lưu ảnh dự đoán. Không dùng các bộ thiếu GT để train supervised. |
| `prepare_data.ipynb` | Giải nén/kiểm kê dataset, kiểm tra cấu trúc và ghi báo cáo số ảnh theo split. |
| `download_assets.ipynb` | Tải các tài nguyên Drive: dataset ZIP, checkpoint UIEB và checkpoint URanker. |
| `check_demo.ipynb` | Smoke check pipeline inference: ảnh mẫu, kích thước output và xử lý input không hợp lệ. |
| `check_training.ipynb` | Smoke check forward/backward, cập nhật trọng số, validation và lưu/nạp checkpoint bằng dữ liệu nhỏ. Không phải kết quả train toàn bộ. |

### Model, Data and Metrics

| File | Vai trò |
|---|---|
| `utils/dataset.ipynb` | Đọc và ghép cặp ảnh; resize, crop, augmentation; `DatasetFromFolder`, `DatasetFromFolder_NR`, `get_loader`. |
| `utils/HVI_transform.ipynb` | Các phép biến đổi màu HVI dùng trong mạng xử lý ảnh. |
| `utils/CIDNet.ipynb` | Mạng CIDNet sử dụng các thành phần HVI; cung cấp mạng phụ trợ cho pipeline loss. |
| `utils/HVI_transformer_utils.ipynb` | Các lớp normalization, downsample và upsample cho mạng HVI. |
| `utils/LCA.ipynb` | Các khối Local Cross Attention. |
| `utils/loss_funcs.ipynb` | Các loss: perceptual, SSIM, edge-aware và Charbonnier cùng các hàm hỗ trợ. Cách kết hợp/trọng số loss của lượt chính nằm trong `compute_loss` ở `TRAIN_ALL.ipynb`. |
| `utils/vgg19.ipynb` | Trích đặc trưng VGG19 cho các loss có sử dụng lớp này. |
| `utils/metrics.ipynb` | `Evaluator`, PSNR, SSIM và các chỉ số không tham chiếu NIQE, UCIQE, URanker. |
| `utils/niqe_utils.ipynb` | Xử lý ảnh và thống kê đặc trưng cho NIQE. |
| `utils/niqe_pris_params.npz` | Tham số thống kê ảnh tự nhiên dùng để tính NIQE. Đây là dữ liệu tính metric. |
| `utils/utils.ipynb` | Vẽ đường cong và lưu ảnh khôi phục. |
| `utils/uranker/uranker_model.ipynb` | Kiến trúc URanker đánh giá chất lượng ảnh. |
| `utils/uranker/uranker_utils.ipynb` | Đọc YAML và dựng/nạp mạng URanker. |
| `utils/uranker/URanker.yaml` | Cấu hình URanker. |
| `utils/uranker/URanker_ckpt.pth` | Trọng số URanker tải sẵn. |

### Web Demo

| File | Vai trò |
|---|---|
| `web/server.py` | FastAPI server cổng 7860; phục vụ giao diện, API inference, trạng thái train và chọn checkpoint. Đây là entry point của web hiện tại. |
| `web/app.py` | Nạp `myModel` và thực hiện `enhance`: EXIF/RGB, giới hạn cạnh dài, tensor, padding chia hết cho 4, inference, crop và xuất ảnh. Có thêm hàm dựng giao diện Gradio cũ. |
| `web/index.html` | Cấu trúc trang Thalassa và vùng điều khiển/upload/so sánh ảnh. |
| `web/style.css` | Bố cục, màu sắc và responsive của giao diện. |
| `web/studio.js` | Điều khiển gallery tĩnh (compare/view/zoom/reference), upload và inference độc lập, tải kết quả và đọc trạng thái train. |
| `web/examples/*.png` | Năm kết quả gallery tạo sẵn bằng checkpoint UIEB pretrained. Xem gallery không gọi inference. |
| `web/examples/*_GT.jpg` | Ảnh tham chiếu UFO/LSUI từ demo gốc. |
| `web/examples/manifest.json` | Model/checkpoint hash, input/output hash và các biến thể 256/512/768 của gallery. |
| `web/examples/architecture.png` | Sơ đồ kiến trúc gốc sao chép từ `demo/uie_arch.png`; dùng trong phần kiến thức và hộp xem ảnh đầy đủ. |
| `web/ocean.js` | Hiệu ứng đại dương WebGL thời gian thực. Không tham gia thuật toán xử lý ảnh. |
| `web/mark.svg` | Biểu tượng giao diện. |
| `demo/samples/` | Ảnh mẫu để thử web; không thay thế test split. |
| `check_web.mjs` | Smoke check giao diện bằng browser/CDP; kiểm tra WebGL, ảnh mẫu, thanh so sánh và inference. Cần Node và công cụ browser của taste-skill trong `.agents/`. |

### Runtime and Maintenance

Mã thuật toán chính nằm trong code cell của notebook. Python import dùng các file cầu nối trong `.runtime/` để web và các module có thể gọi chung mã đó.

| File / directory | Vai trò |
|---|---|
| `.runtime/notebook_runtime.py` | Đọc code của notebook và thực thi trong namespace của module; bỏ cell bootstrap có tag `notebook-only`. |
| `.runtime/model.py`, `.runtime/utils/…`, `.runtime/scripts/…` | Các import bridge tương ứng với notebook cùng đường dẫn. Không phải bản sao thuật toán riêng. |
| `notebooks/source_manifest.json` | Ánh xạ module sang notebook, hash nguồn và ghi nhận thay đổi có chủ đích. |
| `notebooks/model_reference.ipynb` | Baseline model gốc kèm hash để kiểm tra số học mà không cần lịch sử Git upstream. |
| `scripts/build_training_notebook.ipynb` | Công cụ tạo notebook train. Là công cụ bảo trì, không cần chạy trước mỗi lượt train. |
| `scripts/build_project_index.ipynb` | Tạo danh mục module và chạy kiểm tra chuyển đổi. |
| `scripts/convert_notebooks.ipynb` | Công cụ chuyển nguồn sang notebook và tạo import bridge. |
| `scripts/run_notebook.ipynb` | Runner tự động có lưu output/trạng thái; không dùng trong workflow chạy thủ công bằng VS Code hiện tại. |
| `scripts/start_jupyter.ipynb` | Công cụ mở JupyterLab cũ; không cần chạy để dùng notebook trong VS Code. |
| `tests/test_file_writes.ipynb` | Test thao tác ghi/thay thế file, gồm trường hợp file tạm bị khóa trên Windows. |
| `.vscode/settings.json` | Interpreter Conda, notebook editor và quy tắc ẩn thư mục runtime/cache trong Explorer. |
| `.vscode/extensions.json` | Danh sách extension Python/Jupyter cho VS Code. |
| `.agents/skills/`, `skills-lock.json` | Công cụ/skill phát triển giao diện; không phải trọng số model hoặc dependency Python. |
| `AGENTS.md` | Quy ước cho coding agent khi sửa dự án. |
| `requirements.txt` | Danh sách dependency Python dùng chung, ghim phiên bản của môi trường `demo`. |
| `instruction.md` | Hướng dẫn toàn dự án — file đang đọc. |
| `NOTEBOOKS.md`, `RUN_DEMO.md`, `TRAINING.md` | Link chuyển tiếp từ tài liệu cũ về file này. |
| `DRIVE_FILES.md` | Bảng vị trí ba tài nguyên Drive đã tải. |
| `.gitignore`, `.git/` | Quy tắc bỏ qua dataset/checkpoint/log/cache và lịch sử mã nguồn. |

Các file trong `scripts/` là công cụ tạo/chuyển đổi, có thể ghi đè notebook. Không chạy chúng khi notebook có code/output chưa lưu hoặc đang train. Việc chạy toàn bộ cell trong các module nguồn không tự gọi raw cell `if __name__ == '__main__'`; quy trình tương tác hoàn chỉnh là `TRAIN_ALL.ipynb`.

## 3. Environment Setup

Môi trường đang dùng: **Anaconda `demo`, Python 3.10, PyTorch 2.4.0 + CUDA 11.8**. Interpreter:

```text
C:\Users\NCPC\Anaconda3\envs\demo\python.exe
```

Trong Anaconda Prompt, với môi trường hiện có:

```bat
cd /d D:\Xulyanh\demo
conda activate demo
python -m pip install -r requirements.txt
python -m pip check
```

Nếu dựng lại môi trường trên máy Windows có GPU NVIDIA tương thích:

```bat
conda create -n demo python=3.10 pip -y
conda activate demo
cd /d D:\Xulyanh\demo
python -m pip install -r requirements.txt
python -m ipykernel install --user --name demo --display-name "Python (demo, CUDA)"
```

`requirements.txt` là nguồn dependency duy nhất. PyTorch CUDA wheel được lấy từ index của PyTorch ghi trong file; các package còn lại do pip giải quyết. File ghim các dependency trực tiếp, không phải bản freeze mọi thư viện phụ thuộc. Triton không nằm trong cấu hình Windows này. JupyterLab chỉ phục vụ script bảo trì cũ, không được mở khi chạy notebook bằng VS Code.

Nếu bản cài PyTorch trên Windows báo thiếu `libomp140.x86_64.dll`, môi trường hiện tại đã dùng LLVM OpenMP 14. Khi dựng lại và gặp đúng lỗi này, cài trong Anaconda Prompt:

```bat
conda install -y https://conda.anaconda.org/conda-forge/win-64/llvm-openmp-14.0.0-h2d74725_0.tar.bz2
copy "%CONDA_PREFIX%\Library\bin\libomp.dll" "%CONDA_PREFIX%\Library\bin\libomp140.x86_64.dll"
```

## 4. Dataset and Weights

| Path | Nội dung / cách sử dụng |
|---|---|
| `UnderWaterDataset/` | Dataset đã giải nén. Notebook đọc trực tiếp từ đây. |
| `downloads/UnderWaterDataset.zip` | ZIP gốc tải từ Drive. |
| `downloads/dataset_inventory.json` | Báo cáo kiểm kê số ảnh theo bộ/split. |
| `checkpoints/UIEB.pth` | Trọng số tải sẵn cho web demo; không dùng khởi tạo model trong lượt train từ đầu. |
| `utils/uranker/URanker_ckpt.pth` | Trọng số cho metric URanker. |
| `downloads/torch/checkpoints/vgg16-397923af.pth` | Trọng số VGG16 cho loss. |

Ba mục Drive là một ZIP dataset và hai checkpoint, không phải ba folder dataset.

| Dataset directory | Sử dụng |
|---|---|
| `EUVP-Dark/`, `EUVP-Scene/`, `LSUI/`, `UFO-120/`, `UIEB/` | Có input–GT; dùng train/validation/test theo split riêng. |
| `Challenging-60/`, `EUVP/`, `U45/` | Không có GT; dành cho đánh giá không tham chiếu. |

Sau khi loại các input trùng byte giữa các split, cấu hình hiện tại dùng 11.089 cặp train, 1.550 validation và 1.411 test. SHA-256 chỉ phát hiện trùng byte; không phát hiện mọi ảnh trùng nội dung đã được mã hóa lại. Dataset loader nhận `.png`, `.jpg`, `.jpeg`, `.bmp` không phân biệt chữ hoa/thường.

## 5. Training in VS Code

1. Mở folder `D:\Xulyanh\demo` trong VS Code, sau đó mở `TRAIN_ALL.ipynb`.
2. Chọn **Select Kernel → Python Environments → demo** hoặc kernel **Python (demo, CUDA)**. Kiểm tra interpreter đúng đường dẫn ở phần Environment Setup.
3. Chạy từ trên xuống bằng từng cell hoặc **Run All**. Cell Environment kiểm tra GPU; không có script train nền cần mở thêm.
4. Xem bảng, ảnh, loss và biểu đồ ngay dưới từng cell. Nhấn **Ctrl+S** để lưu notebook cùng output.
5. Sau đủ epoch, chạy cell **Test** để đánh giá checkpoint tốt nhất. Kết quả nghiệm thu nằm ở `test_results.csv` và output cell này.

| Section | Thực hiện |
|---|---|
| Environment | Import module, thiết lập device và kiểm tra CUDA. |
| Configuration | Seed, epoch, batch, learning rate, dataset; tạo thư mục run và khóa ngăn train trùng. |
| Dataset Inventory and Deduplication | Ghép input–GT, kiểm kê, loại trùng giữa split, ghi manifest. |
| Input and Ground Truth / DataLoader | Hiển thị mẫu, tạo batch train/validation/test. |
| Model and Loss Networks / Loss Functions | Khởi tạo model ngẫu nhiên, mạng đặc trưng và công thức loss. |
| Gradient and GPU Memory Check | Thử forward/backward và đo bộ nhớ; chưa phải kết quả train. |
| Validation and Checkpoints | Các hàm đánh giá, trạng thái, lưu checkpoint, biểu đồ và ảnh preview. |
| Training | Tối ưu model, validation từng epoch, chọn best checkpoint. |
| Test | Đánh giá test split sau khi training hoàn tất. |
| Results | Danh mục sản phẩm thí nghiệm. |

Cấu hình mặc định: seed 7, 100 epoch, ảnh 256×256, batch 4, tích lũy 6 bước (batch hiệu dụng 24), learning rate 0.002, weight decay 0.00001. Các biến này nằm ở cell Configuration. Thay đổi trước khi bắt đầu lượt train; không sửa giữa lượt.

Mỗi lần chạy lại toàn bộ sẽ tạo một thư mục run mới, không resume checkpoint cũ. Để bắt đầu lượt mới, dùng **Restart Kernel and Run All Cells**. Chỉ chạy một lượt tại một thời điểm. Dừng kernel, ngủ hoặc tắt máy sẽ ngắt train. Sau mỗi epoch, notebook lưu trạng thái đầy đủ vào `checkpoints/epoch_XXX.pth` của run. Để tiếp tục một lượt bị ngắt, đặt biến môi trường `TRAIN_RESUME_FROM` trỏ tới `checkpoints/epoch_XXX.pth` hoặc `last_checkpoint.pth` trước khi khởi động kernel; notebook ghi tiếp vào thư mục run cũ, nạp model/optimizer/scheduler/RNG/history và train từ epoch kế tiếp. Không đặt biến này thì mỗi lần chạy là một run mới.

## 6. Outputs and Acceptance

Kết quả mỗi lượt nằm tại `output/demo/ALL/notebook_TIMESTAMP/`:

| File | Ý nghĩa |
|---|---|
| `config.json` | Cấu hình và môi trường tính toán của lượt đó. |
| `data_manifest.csv` | Các cặp ảnh được dùng; các báo cáo kiểm kê/loại trùng đi kèm ghi dữ liệu bị loại. |
| `initial_model.pth` | Trọng số model ngẫu nhiên ban đầu. |
| `history.csv` | Train loss, macro validation PSNR/SSIM và chỉ số từng bộ theo epoch. |
| `curves.png` | Biểu đồ loss và validation. |
| `latest_preview.png` | Ảnh input/prediction/GT sau validation gần nhất. |
| `best_model.pth` | Model đạt macro validation PSNR cao nhất. |
| `last_model.pth` | Model ở epoch cuối đã hoàn tất. |
| `last_checkpoint.pth` | Model, optimizer, scheduler, epoch và RNG để bảo toàn trạng thái train. |
| `checkpoints/epoch_XXX.pth` | Trạng thái đầy đủ (như `last_checkpoint.pth`, kèm history) của từng epoch; dùng để resume hoặc lấy lại model ở epoch bất kỳ. |
| `test_results.csv` | PSNR/SSIM của từng test dataset sau khi hoàn tất train. |

`output/training_status.json` là trạng thái run hiện tại cho web; `output/notebook_training.lock` giúp ngăn chạy hai lượt đồng thời trên Windows. `training_complete` nghĩa là vòng train xong; `complete` được ghi sau khi cell test hoàn tất.

Để nghiệm thu: đối chiếu config và manifest, xem loss/validation trong history, kiểm tra best checkpoint, sau đó đọc test_results. Không dùng ảnh preview hay trọng số UIEB tải sẵn làm bằng chứng về chất lượng lượt tự train.

## 7. Web Demo

Trong Anaconda Prompt:

```bat
cd /d D:\Xulyanh\demo
conda activate demo
set DEMO_DEVICE=cpu
python web/server.py
```

Mở http://127.0.0.1:7860. Giao diện dùng tiếng Anh, giữ đại dương WebGL.

1. **Explore** xuất hiện trước khu upload: chọn một trong năm ảnh mẫu. Kết quả đã tạo sẵn từ checkpoint UIEB pretrained; không cần chọn model hoặc bấm xử lý.
2. Chọn **Longest edge** 256/512/768 px để xem kết quả model tạo sẵn ở từng mức (giữ tỷ lệ, không phóng lớn ảnh nguồn). Ảnh nguồn gallery là 640×480, nên cap 768 cho output thực 640×480. Chọn **Compare**, **Side by side**, **Original** hoặc **Enhanced**; dùng thanh kéo, zoom 1×/2×/3×, di chuyển con trỏ để xem vùng chi tiết hoặc **Expand** để mở fullscreen. UFO và LSUI có thêm **View reference image**.
3. Phần **Inside the Network** hiển thị sơ đồ kiến trúc gốc; bấm **Inspect full diagram** để đọc ảnh đầy đủ, **Close** hoặc Esc để đóng. Các mục **Read the Diagram** giải thích adaptive white balance, WEB, SGFB và supervision. Nguồn ở **Method and example sources**.
4. **Your Upload** nằm sau demo/kiến thức: tải JPG/PNG/WEBP (tối đa 20 MB), chọn model/size rồi bấm **Enhance your image**. Chấp nhận ảnh ngoài dataset, không cần GT. Kéo so sánh và bấm **Download result** để tải PNG.

Gallery và upload độc lập: chọn ảnh mẫu/view/zoom không thay đổi ảnh thật hay kết quả upload. Các kết quả gallery không phải kết quả của lượt đang train. Ctrl+C ở terminal server để dừng.

Web dùng CPU khi `DEMO_DEVICE=cpu` để dành GPU cho training. Giới hạn cạnh dài có các mức 256/512/768; ảnh giữ tỷ lệ, padding để kích thước chia hết cho 4 rồi crop padding khỏi output.

- `GET /api/status`: device, trạng thái training và khả năng sử dụng checkpoint mới.
- `POST /api/enhance`: nhận file `image`, `max_side` và lựa chọn `model` (`pretrained` hoặc `trained`); trả ảnh PNG.
- **Pretrained** dùng `checkpoints/UIEB.pth`.
- **Trained** lấy `best_model.pth` từ run_path trong `output/training_status.json`. Chỉ khả dụng sau validation đầu tiên có checkpoint. Không tự tìm checkpoint trong kết quả cũ.

## 8. Development and Cleanup

Sửa code cell của module notebook tương ứng, chẳng hạn `model.ipynb` hoặc `utils/dataset.ipynb`. Web và notebook import cùng mã qua `.runtime/`. Không xóa `.runtime/` dù VS Code ẩn thư mục này. Khi thay đổi nguồn module, hash kiểm tra trong manifest cần được cập nhật có kiểm soát; không bỏ qua báo lỗi hash.

| Directory | Có thể dọn khi nào? |
|---|---|
| `logs/dev/` | Log phát triển, script QA và bản đối chiếu tạm; có thể xóa khi không cần nữa. Kết quả cũ đã tách ở `logs/dev/old-results/`. |
| `logs/runtime/` | Log stdout/stderr server; dọn sau khi dừng server nếu không cần debug. |
| `logs/training/` | Log runner/train; chỉ dọn khi không cần đối chiếu và tiến trình tương ứng đã dừng. |
| `__pycache__/`, `.ipynb_checkpoints/` | Cache và autosave; dọn khi không còn cần bản phục hồi notebook. |
| `.venv/` | Môi trường cũ; workflow hiện tại dùng Conda `demo`. |
| `outputs/` | Thư mục preview tương thích web cũ; giữ thư mục vì server còn mount đường dẫn này. |
| `UnderWaterDataset/`, `downloads/`, `checkpoints/`, `output/demo/` | Dữ liệu, tài nguyên tải về và kết quả thật; giữ nếu còn sử dụng hoặc cần nghiệm thu. |

Tiêu đề và tên module trong notebook dùng tiếng Anh. Notebook chỉ giữ mô tả kỹ thuật/phương pháp/kết quả; hướng dẫn thao tác nằm trong `instruction.md`.
