const { db } = require('./config/firebase');

const seedMangas = [
  {
    title: 'เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว (ข้อมูลจริงจาก Backend)',
    description: 'ซาโตรุ มิคามิ หนุ่มออฟฟิศธรรมดาที่ถูกแทงตาย และได้ไปเกิดใหม่ในต่างโลก แต่ดันเกิดมาเป็น "สไลม์" สไลม์ตัวนี้มีความสามารถพิเศษในการกลืนกินทุกสิ่ง...',
    coverUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=600&auto=format&fit=crop',
    author: 'ฟูเซะ',
    status: 'กำลังตีพิมพ์',
    views: 1250000,
    rating: 4.8,
    tags: ['แฟนตาซี', 'ต่างโลก', 'ผจญภัย', 'เกิดใหม่'],
    isNew: true
  },
  {
    title: 'Solo Leveling - ลุยเดี่ยวอัพเลเวล',
    description: 'ซองจินอู ฮันเตอร์ระดับ E ที่อ่อนแอที่สุดในโลก ได้ตื่นขึ้นมาพร้อมกับระบบที่ทำให้เขาสามารถอัพเลเวลได้เพียงคนเดียว!',
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop',
    author: 'Chugong',
    status: 'จบแล้ว',
    views: 850000,
    rating: 4.9,
    tags: ['แอคชั่น', 'แฟนตาซี', 'ระบบ'],
    isNew: false
  }
];

const mockImages = [
    'https://images.unsplash.com/photo-1542840410-3092f99611a3?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop'
];

async function seedDatabase() {
  console.log('🌱 Starting Database Seeding...');

  try {
    const mangasRef = db.collection('mangas');
    
    for (let i = 0; i < seedMangas.length; i++) {
        const mangaData = seedMangas[i];
        
        // Add Manga
        const docRef = await mangasRef.add({
            ...mangaData,
            createdAt: new Date().toISOString()
        });
        
        console.log(`✅ Added Manga: ${mangaData.title} (ID: ${docRef.id})`);

        // Add 2 Mock Chapters for each Manga
        const chaptersRef = docRef.collection('chapters');
        
        await chaptersRef.add({
            number: 1,
            title: 'จุดเริ่มต้น',
            date: '2023-01-01',
            isLocked: false,
            price: 0,
            images: mockImages,
            createdAt: new Date().toISOString()
        });

        await chaptersRef.add({
            number: 2,
            title: 'การตื่นรู้',
            date: '2023-01-08',
            isLocked: true,
            price: 15,
            images: mockImages,
            createdAt: new Date().toISOString()
        });

        console.log(`  └─ Added 2 Chapters for ${mangaData.title}`);
    }

    console.log('🎉 Seeding Complete! You can now fetch real data from the API.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  }
}

seedDatabase();
