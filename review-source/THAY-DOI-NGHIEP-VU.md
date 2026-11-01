# Bản cập nhật nghiệp vụ đánh giá — 31/10/2026

## Chạy bản mẫu

```powershell
npm ci
npm run dev -- --host 127.0.0.1
```

Chọn vai trò ở góc phải: CQĐV/CQ, Văn phòng/Ban Chiến lược, CQTT, Hội đồng, TGĐ.
Đây là dữ liệu mẫu trong React state: tải lại trang sẽ khôi phục dữ liệu mẫu; chưa kết nối lưu trữ, xác thực hoặc ký số.

## Luồng đã cập nhật

1. CQĐV/CQ nhập kết quả và CBNV tự đánh giá. Gửi trực tiếp VP/Ban CL.
2. VP cho Khối Cơ quan; Ban CL cho Khối Đơn vị. Xem Tổng hợp KPI và phụ lục tương ứng. Chỉ tổng hợp và gửi chung các phiếu đang tổng hợp sang CQTT từ tab Tổng hợp đánh giá ở màn danh sách; không gửi từng phiếu chi tiết, không trả CQĐV/CQ điều chỉnh.
3. CQTT chấm nhóm trọng tâm và chức năng trên Tổng hợp KPI. Đây là phần điểm đã nhân tỷ trọng của mục tiêu gốc; không mặc định 20/80 cho mọi phiếu.
4. CQTT có thể yêu cầu tiếp thu/bảo lưu. CQĐV/CQ bổ sung kết quả và phản hồi. Điểm CQTT được giữ nguyên. CQTT gửi báo cáo Hội đồng.
5. Hội đồng kế thừa tổng CQTT, sửa Điểm đánh giá trên Tong hop Ki của BM01, xác nhận tuân thủ và Ki. Không chấm mục tiêu tại cột QLTT.
6. Kết quả Hội đồng tự điền phần tổng kết template cá nhân. Tự phân bổ xuống cột QLTT đánh giá từng mục tiêu theo tỷ lệ điểm tự đánh giá bằng cùng một hệ số, giới hạn 1–5; phần còn lại tiếp tục được phân bổ khi có mục tiêu chạm giới hạn. Giữ nguyên điểm tự đánh giá và tỷ trọng. Tổng theo tỷ trọng khớp điểm Hội đồng. Điểm dòng hiển thị 4 chữ số thập phân, tổng được tính từ giá trị đầy đủ.
7. TGĐ phê duyệt hoặc yêu cầu Hội đồng điều chỉnh/trình lại.
8. Hội đồng gửi VP/Ban CL; đầu mối gửi CQĐV/CQ; CQĐV/CQ ghi nhận trình ký phiếu ĐG kèm phiếu GNV.

## Các form

- Trang danh sách: Danh sách, Tổng hợp KPI, Tong hop Ki, Phụ lục theo khối.
- Trang hồ sơ: Template cá nhân, Tổng hợp KPI, Tong hop Ki, phụ lục tương ứng và Phiếu giao nhiệm vụ.
- Bảng tổng hợp cho phép lưu từng dòng. Trong hồ sơ, chuyển bước cũng lưu thay đổi bảng đang nhập trước khi kiểm tra nghiệp vụ.
- Mỗi lần lưu/chuyển bước ghi lịch sử, có ảnh chụp dữ liệu trước/sau.
- Xuất CSV bảng tổng hợp hoặc template. Đây chưa phải xuất nguyên định dạng XLSX của Excel gốc.

## Hồ sơ mẫu để kiểm tra

- DG-2026-Q3-004: bắt đầu tự đánh giá; có thể thử toàn bộ luồng.
- DG-2026-Q3-005: VP tổng hợp và chuyển CQTT.
- DG-2026-Q3-003: CQTT rà soát/chấm và yêu cầu phản hồi.
- DG-2026-Q3-002: Hội đồng kế thừa/chỉnh tổng điểm và trình TGĐ.
- DG-2026-Q3-001: TGĐ phê duyệt hoặc yêu cầu điều chỉnh.

## Kiểm tra

```powershell
# Khi môi trường Windows chặn rename trong thư mục Temp mặc định:
New-Item -ItemType Directory -Force .test-tmp | Out-Null
$env:TEMP = (Resolve-Path .test-tmp).Path
$env:TMP = $env:TEMP
npm test
node --experimental-strip-types --test src/test/workflow.node.test.mjs src/test/allocation.node.test.mjs
npx tsc --noEmit
npm run build
```

Source cập nhật nằm trong thư mục này; chưa đồng bộ lên dự án Lovable hoặc triển khai lên môi trường thật.

## Cập nhật phân bổ tự động
- Điểm tự phân bổ được lưu trong từng mục tiêu, đi theo lịch sử trước/sau và bản xuất CSV.
- Hội đồng sửa tổng điểm thì hệ thống phân bổ lại. Chọn Ki K và xóa tổng điểm sẽ xóa điểm phân bổ.
- Quy tắc tỷ lệ được giữ cho các mục tiêu chưa chạm sàn/trần; mục tiêu chạm sàn 1 hoặc trần 5 được cố định.
## Thiết kế Tổng hợp đánh giá theo template
- Cột TT, mã số, họ tên, cơ quan/đơn vị; nhóm Điểm CQ tự đánh giá và Thường trực đánh giá đều gồm NV trọng yếu (20%), NV chức năng (80%), Tổng.
- Các tỷ trọng trên tiêu đề lấy từ dữ liệu phiếu; nếu các phiếu không cùng tỷ trọng thì hiển thị Theo phiếu.
- Có Lý do, Đề xuất xếp hạng Ki, Trợ lý, Ghi chú và phản hồi CQĐV/CQ.
- Đề xuất Ki lưu riêng với Ki Hội đồng. VP/Ban CL lưu trợ lý/ghi chú ở bước tổng hợp; CQTT chấm điểm và đề xuất ở bước rà soát.
- Tự đánh giá chỉ đọc; sửa tổng điểm Hội đồng và phân bổ điểm tự động không thay đổi.

## Gửi tổng hợp CQTT theo lô
- VP/Ban CL dùng nút Gửi CQTT (N phiếu) tại bảng Tổng hợp đánh giá ở trang danh sách.
- Phạm vi là kỳ và khối đang chọn; tìm kiếm hoặc bộ lọc bước xử lý không làm bỏ sót phiếu đang tổng hợp trong phạm vi này. Mỗi khối/kỳ là một lô riêng.
- Trợ lý, ghi chú đang nhập được lưu cùng lần gửi. Đổi bộ lọc không làm mất bản nháp của dòng.
- Không có nút gửi CQTT trong chi tiết cá nhân; các phiếu ở bước khác được giữ nguyên.
