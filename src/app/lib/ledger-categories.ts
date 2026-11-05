/**
 * 消费大类自动归类（衣食住行/学习用品/生活用品/娱乐休闲/其他）
 * 保存账单时按规则自动打上大类标签，供统计饼图与 AI 建议使用。
 */

export const MAJOR_CATEGORY_COLORS: Record<string, string> = {
  衣食住行: '#3B82F6',
  学习用品: '#8B5CF6',
  生活用品: '#06B6D4',
  娱乐休闲: '#F59E0B',
  其他: '#6B7280',
};

export const MAJOR_CATEGORY_ORDER = [
  '衣食住行',
  '学习用品',
  '生活用品',
  '娱乐休闲',
  '其他',
] as const;

/** 小类 → 大类 规则映射（结合备注关键词兜底判断） */
export function mapToMajorCategory(
  category: string,
  notes?: string | null,
): string {
  const direct: Record<string, string> = {
    餐饮: '衣食住行',
    交通: '衣食住行',
    购物: '生活用品',
    学习: '学习用品',
    生活: '生活用品',
    娱乐: '娱乐休闲',
    其他: '其他',
  };
  if (direct[category]) return direct[category];

  const text = `${category} ${notes || ''}`;
  if (/书|笔|文具|资料|课程|学费|辅导|考试|打印/.test(text)) return '学习用品';
  if (/衣|鞋|裤|外套|饭|餐|吃|喝|早餐|午饭|晚饭|地铁|公交|打车|高铁|火车|机票/.test(text))
    return '衣食住行';
  if (/纸巾|洗发|沐浴|牙膏|日用|宿舍|洗衣|水杯/.test(text)) return '生活用品';
  if (/电影|游戏|KTV|唱歌|旅游|奶茶|会员|追剧/.test(text)) return '娱乐休闲';
  return '其他';
}
