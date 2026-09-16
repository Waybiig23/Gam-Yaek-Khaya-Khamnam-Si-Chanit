import { motion } from 'motion/react';
import { BookOpen, X, CheckCircle2 } from 'lucide-react';

interface GrammarGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GrammarGuideModal({ isOpen, onClose }: GrammarGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="grammar-guide-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs"
    >
      <motion.div
        id="grammar-guide-card"
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border-2 border-orange-200 flex flex-col max-h-[88dvh] select-none text-left"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3.5 sm:px-6 sm:py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl">
              <BookOpen className="text-yellow-200" size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black leading-tight">รอบรู้เรื่องคำนาม ๔ ชนิด</h2>
              <p className="text-blue-100 text-[11px] sm:text-xs">หลักไวยากรณ์ไทยฉบับเข้าใจง่าย</p>
            </div>
          </div>
          <button
            id="close-guide-btn"
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-gray-800 text-xs sm:text-sm leading-relaxed">
          {/* Intro Box */}
          <div className="p-3 sm:p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 font-medium">
            <b>คำนาม</b> คือ คำที่หมายถึง คน สัตว์ สิ่งของ สภาพธรรมชาติ สถานที่ ความคิด ความเชื่อ ค่านิยม
            รวมทั้งสิ่งที่มีชีวิตและไม่มีชีวิต ทั้งที่เป็นรูปธรรมและนามธรรม แบ่งออกเป็น 4 ชนิด ดังนี้
          </div>

          {/* Type 1 */}
          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-black text-sm sm:text-base">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">๑</span>
              <h3>คำนามสามัญ (นามทั่วไป)</h3>
            </div>
            <p className="text-gray-700">
              คือ คำนามทั่วไป <b>ไม่ได้เจาะจง</b> ว่าหมายถึงสิ่งใด เช่น คน, บ้าน, วัด, โรงเรียน, สัตว์, ข้าว, ช้าง, แมว, 
              <span className="text-blue-700 font-bold"> นายกรัฐมนตรี</span> (ตำแหน่งทั่วไป ไม่ได้เจาะจงบุคคล), คุณครู, ตำรวจ
              รวมถึงคำที่ขึ้นต้นด้วย "การ" หรือ "ความ" แต่นำหน้าคำนาม เช่น <span className="font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded">การบ้าน, การเมือง, การเรือน</span>
            </p>
            <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 text-xs">
              <span className="font-bold text-blue-800">📌 อาจมีความหมายกว้างและแคบต่างกัน:</span>
              <ul className="list-disc list-inside mt-1 text-gray-600 space-y-0.5">
                <li>กว้าง: <b>ผลไม้</b> ➔ แคบ: <b>ทุเรียน, มะม่วง, ชมพู่</b></li>
                <li>กว้าง: <b>ทุเรียน</b> ➔ แคบ: <b>ก้านยาว, หมอนทอง, ชะนี</b></li>
                <li>กว้าง: <b>มะม่วง</b> ➔ แคบ: <b>ฟ้าลั่น, เขียวเสวย, อกร่อง</b></li>
              </ul>
            </div>
          </div>

          {/* Type 2 */}
          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-red-200 bg-red-50/50 space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-black text-sm sm:text-base">
              <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">๒</span>
              <h3>คำนามวิสามัญ (นามชี้เฉพาะ)</h3>
            </div>
            <p className="text-gray-700">
              คือ คำนามที่เป็น <b>ชื่อเฉพาะ</b> สำหรับเรียกบุคคลหรือสิ่งใดสิ่งหนึ่ง เช่น
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 p-2 rounded-xl border border-red-100">
                • <b className="text-red-700">นันทวัฒน์</b> (ชื่อเฉพาะของคน)<br />
                • <b className="text-red-700">ฟูจิ</b> (ชื่อเฉพาะของภูเขาไฟ)
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-red-100">
                มักใช้ตามหลังนามสามัญ เช่น<br />
                • <b>อาจารย์เพ็ญศรี</b>, <b>ประเทศไทย</b><br />
                • <b>จังหวัดอุดรธานี</b>, <b>โรงเรียนบ้านเจริญสุข</b>
              </div>
            </div>
          </div>

          {/* Type 3 */}
          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-green-200 bg-green-50/50 space-y-2">
            <div className="flex items-center gap-2 text-green-900 font-black text-sm sm:text-base">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">๓</span>
              <h3>คำลักษณนาม (บอกลักษณะคำนามหรือคำกริยา)</h3>
            </div>
            <p className="text-gray-700">
              คือ คำที่บอกลักษณะ ขนาด หรือหมวดหมู่ของคำนามและคำกริยา (รวมถึงสมุหนาม):
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="bg-white/80 p-2.5 rounded-xl border border-green-100">
                <span className="font-bold text-green-800">บอกลักษณะคำนาม (อยู่หน้าหรือหลัง):</span><br />
                ดินสอ 1 <b>แท่ง</b>, ปากกา 2 <b>ด้าม</b>, หนังสือ 3 <b>เล่ม</b>, <b>ฝูง</b>ผึ้ง, <b>โขลง</b>ช้าง, กอง, คณะ, แผ่น, คัน, ตัว, ใบ
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-green-100">
                <span className="font-bold text-green-800">บอกลักษณะคำกริยา (ปรากฏอยู่หลัง):</span><br />
                ช่วยหยุด<b>ที</b>, เดิน 20 <b>ก้าว</b>, ตี 5 <b>ที</b>, หลับ 2 <b>ตื่น</b>, หอม 2 <b>ฟอด</b>
              </div>
            </div>
          </div>

          {/* Type 4 */}
          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-purple-200 bg-purple-50/50 space-y-2">
            <div className="flex items-center gap-2 text-purple-900 font-black text-sm sm:text-base">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">๔</span>
              <h3>คำอาการนาม</h3>
            </div>
            <p className="text-gray-700">
              คือ การนำคำกริยาหรือคำวิเศษณ์มาแปลงเป็นคำนาม โดยเติม <b>การ-</b> และ <b>ความ-</b> นำหน้า
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100">
                <span className="font-bold text-purple-800">นำหน้าคำกริยา:</span><br />
                <b>การนอน</b>, <b>การกิน</b>, <b>ความรัก</b>, <b>ความคิดเห็น</b>, การทำงาน, การวิ่ง
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100">
                <span className="font-bold text-purple-800">นำหน้าคำวิเศษณ์:</span><br />
                <b>ความงาม</b>, <b>ความดี</b>, <b>ความร้อน</b>, <b>ความหลัง</b> (หลัง = อดีต/ล่วงไปแล้ว เป็นคำวิเศษณ์), ความสุข, ความยุติธรรม
              </div>
            </div>

            {/* Trick Alert Box */}
            <div className="bg-amber-50 border-2 border-amber-300 p-3 rounded-xl text-xs space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-900 font-black">
                <span>⚠️</span>
                <span>ข้อควรระวัง! คำหลอกอาการนาม (มักเข้าใจผิดในการสอบ):</span>
              </div>
              <p className="text-gray-700 leading-relaxed">
                ถ้าคำที่ตามหลังคำว่า <b>"การ"</b> หรือ <b>"ความ"</b> เป็น <span className="text-red-600 font-bold underline">คำนามอยู่แล้ว</span> ไม่ได้เป็นคำกริยาหรือคำวิเศษณ์ การที่นำเอาคำว่า "การ" หรือ "ความ" ไปนำหน้า <b>จึงไม่ทำให้เป็นอาการนาม</b> แต่จะจัดเป็น <b className="text-blue-700 font-bold">"คำนามสามัญ (นามทั่วไป)"</b>
              </p>
              <div className="bg-white p-2 rounded-lg border border-amber-200 text-gray-700 space-y-1">
                <div>
                  • <b>การบ้าน</b> ➔ เพราะคำว่า <i>"บ้าน"</i> เป็นคำนามอยู่แล้ว การนำ "การ" ไปนำจึงไม่ใช่อาการนาม แต่เป็น <b>นามสามัญ</b>
                </div>
                <div>
                  • <b>การเรือน, การเมือง, การเงิน</b> ➔ <i>เรือน, เมือง, เงิน</i> เป็นคำนาม ➔ เป็น <b>นามสามัญ</b>
                </div>
                <div>
                  • <b>การไฟฟ้า, การประปา</b> ➔ <i>ไฟฟ้า, ประปา</i> เป็นคำนาม (หมายถึงหน่วยงาน/กิจการ) ➔ เป็น <b>นามสามัญ</b>
                </div>
                <div>
                  • <b>ความแพ่ง, ความอาญา, ความวัวความควาย</b> ➔ <i>แพ่ง, อาญา</i> เป็นคำนามศัพท์คดีความ ➔ เป็น <b>นามสามัญ</b>
                </div>
                <div className="pt-1 text-purple-900 bg-purple-50 p-2 rounded border border-purple-200 font-medium">
                  💡 <b>ข้อสังเกตคำว่า "ความหลัง":</b> คำว่า <i>"หลัง"</i> มีหลายความหมาย ทั้งคำนาม (เช่น ข้างหลัง, บ้าน ๑ หลัง) และคำวิเศษณ์บอกกาลเวลา (เช่น วันหลัง, กาลหลัง หมายถึง อดีต/ล่วงไปแล้ว) ดังนั้น "ความหลัง" จึงเกิดจาก <b>ความ + วิเศษณ์</b> จัดเป็น <b>คำอาการนาม</b> อย่างถูกต้อง
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="text-[11px] text-gray-500 flex items-center gap-1">
            <CheckCircle2 size={14} className="text-green-600" /> อ้างอิงตามหลักสูตรภาษาไทย
          </div>
          <button
            id="close-guide-footer-btn"
            onClick={onClose}
            className="px-4 sm:px-5 py-1.5 sm:py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            เข้าใจแล้ว เข้าเล่นเลย
          </button>
        </div>
      </motion.div>
    </div>
  );
}
