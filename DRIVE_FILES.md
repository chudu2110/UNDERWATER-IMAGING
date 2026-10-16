# Ba mục đã tải từ Google Drive nằm ở đâu?

Đây là một file ZIP dataset và hai file trọng số, không phải ba folder Drive.

| Mục Drive | Vị trí trong dự án |
|---|---|
| Dataset đầy đủ, file ZIP gốc | `downloads/UnderWaterDataset.zip` |
| Dataset đã giải nén để train/test | `UnderWaterDataset/` |
| Trọng số UIEB có sẵn cho demo | `checkpoints/UIEB.pth` |
| Trọng số URanker để đánh giá chất lượng ảnh | `utils/uranker/URanker_ckpt.pth` |

`UnderWaterDataset/` có 8 thư mục: `Challenging-60`, `EUVP`, `EUVP-Dark`, `EUVP-Scene`, `LSUI`, `U45`, `UFO-120`, `UIEB`. File `downloads/dataset_inventory.json` ghi số ảnh từng split.

VGG16 ở `downloads/torch/checkpoints/vgg16-397923af.pth` là trọng số phụ trợ cho loss, tải từ PyTorch, không nằm trong ba liên kết Drive.

Log và file kiểm thử tạm trong quá trình thiết lập/code nằm tại `logs/dev/`, có thể xóa sau khi xong việc. Log server hiện tại ở `logs/runtime/`, log train thật ở `logs/training/`. Trọng số và chỉ số huấn luyện mới nằm trong `output/demo/ALL/`; đây là kết quả cần giữ. Mở `TRAIN_ALL.ipynb` để kiểm tra từng bước.
