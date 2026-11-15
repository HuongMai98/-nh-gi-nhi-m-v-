/**
 * Danh mục tổ chức Viettel (mô phỏng bảng VHR_ORG).
 * org_type = 1: cơ quan trực thuộc Tập đoàn (khối cơ quan); org_type = 0: đơn vị (công ty con, đơn vị thành viên).
 * Nút nhóm (Tập đoàn, Công ty mẹ, Khối...) không có org_type.
 * shortcut: dữ liệu mẫu tổng hợp từ báo cáo thường niên công khai của Viettel; thay bằng API VHR_ORG khi tích hợp.
 */
export type OrgType = 0 | 1;
export type OrgNode = { id: string; name: string; orgType?: OrgType; children?: OrgNode[] };

const ban = (id: string, name: string): OrgNode => ({ id, name, orgType: 1 });
const dv = (id: string, name: string): OrgNode => ({ id, name, orgType: 0 });

export const ORG_TREE: OrgNode[] = [
  {
    id: "viettel",
    name: "Tập đoàn Công nghiệp - Viễn thông Quân đội",
    children: [
      {
        id: "cong-ty-me",
        name: "Công ty mẹ - Tập đoàn Công nghiệp - Viễn thông Quân đội",
        children: [
          {
            id: "khoi-co-quan",
            name: "Khối cơ quan Tập đoàn",
            children: [
              ban("ban-giam-doc", "Ban Giám đốc Tập đoàn"),
              ban("co-quan-chinh-tri", "Cơ quan Chính trị"),
              ban("van-phong", "Văn phòng"),
              ban("ban-chien-luoc", "Ban Chiến lược"),
              ban("ban-to-chuc-nhan-luc", "Ban Tổ chức Nhân lực"),
              ban("ban-cntt", "Ban Công nghệ thông tin"),
              ban("ban-cn-cnc", "Ban Công nghiệp Công nghệ cao"),
              ban("ban-dau-tu-xay-dung", "Ban Đầu tư - Xây dựng"),
              ban("ban-dau-tu-tai-chinh", "Ban Đầu tư tài chính"),
              ban("ban-doi-ngoai", "Ban Đối ngoại"),
              ban("ban-hanh-chinh", "Ban Hành chính"),
              ban("ban-ky-thuat", "Ban Kỹ thuật"),
              ban("ban-phap-che", "Ban Pháp chế"),
              ban("ban-tai-chinh-ke-toan", "Ban Tài chính Kế toán"),
              ban("ban-kiem-soat-noi-bo", "Ban Kiểm soát nội bộ"),
              ban("ban-thuong-hieu", "Ban Thương hiệu và Truyền thông"),
            ],
          },
          {
            id: "khoi-phu-thuoc",
            name: "Đơn vị hạch toán phụ thuộc",
            children: [
              dv("vtt", "Tổng Công ty Viễn thông Viettel"),
              dv("vtnet", "Tổng Công ty Mạng lưới Viettel"),
              dv("vts", "Tổng Công ty Giải pháp doanh nghiệp Viettel"),
              dv("vhtc", "Tổng Công ty Công nghiệp Công nghệ cao Viettel"),
              dv("vds", "Tổng Công ty Dịch vụ số Viettel"),
              dv("vqtts", "Công ty Quản lý tài sản Viettel"),
              dv("vmedia", "Công ty Truyền thông Viettel"),
              dv("vcs", "Công ty An ninh mạng Viettel"),
              dv("vhkvt", "Viện Hàng không vũ trụ Viettel"),
              dv("vkgm", "Trung tâm Không gian mạng Viettel"),
              dv("vtthao", "Trung tâm Thể thao Viettel"),
              dv("vacademy", "Học viện Viettel"),
            ],
          },
        ],
      },
      {
        id: "cong-ty-con",
        name: "Công ty con",
        children: [
          dv("vgi", "Tổng Công ty Cổ phần Đầu tư quốc tế Viettel"),
          dv("vtp", "Tổng Công ty Cổ phần Bưu chính Viettel"),
          dv("ctr", "Tổng Công ty Cổ phần Công trình Viettel"),
          dv("vtk", "Công ty Cổ phần Tư vấn thiết kế Viettel"),
          dv("vtx", "Công ty TNHH MTV Thương mại và Xuất nhập khẩu Viettel"),
          dv("m1", "Công ty TNHH MTV Thông tin M1"),
          dv("m3", "Công ty TNHH MTV Thông tin M3"),
          dv("vic", "Công ty TNHH MTV Đầu tư công nghệ Viettel"),
          dv("cht", "Công ty TNHH hai thành viên Viettel - CHT"),
        ],
      },
    ],
  },
];

const index = new Map<string, { node: OrgNode; parent?: string }>();
(function walk(nodes: OrgNode[], parent?: string) {
  for (const n of nodes) {
    index.set(n.id, { node: n, ...(parent ? { parent } : {}) });
    if (n.children) walk(n.children, n.id);
  }
})(ORG_TREE);

export const orgById = (id: string) => index.get(id)?.node;
export const orgName = (id: string) => orgById(id)?.name ?? id;
/** Mọi id của nút và các nút con. */
export function descendants(node: OrgNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(descendants)];
}
/** Lá (đơn vị/cơ quan thực) dưới nút. */
export function leaves(node: OrgNode): OrgNode[] {
  return node.children?.length ? node.children.flatMap(leaves) : [node];
}
export const ALL_ORG_LEAVES = ORG_TREE.flatMap(leaves);
/** Lọc cây theo org_type và từ khoá; giữ nhánh có lá khớp. */
export function filterOrgTree(nodes: OrgNode[], type: OrgType | "all", q: string): OrgNode[] {
  const k = q.trim().toLocaleLowerCase("vi");
  return nodes.flatMap((n) => {
    if (n.children?.length) {
      const children = filterOrgTree(n.children, type, q);
      return children.length ? [{ ...n, children }] : [];
    }
    const typeOk = type === "all" || n.orgType === type;
    const textOk = !k || n.name.toLocaleLowerCase("vi").includes(k);
    return typeOk && textOk ? [n] : [];
  });
}
/** Rút gọn danh sách lá đã chọn thành các nút cao nhất được chọn đủ (để hiển thị). */
export function compactOrgSelection(selected: string[]): string[] {
  const set = new Set(selected);
  const out: string[] = [];
  (function walk(nodes: OrgNode[]) {
    for (const n of nodes) {
      const ls = leaves(n);
      if (ls.every((l) => set.has(l.id))) out.push(n.id);
      else if (n.children) walk(n.children);
    }
  })(ORG_TREE);
  return out;
}
