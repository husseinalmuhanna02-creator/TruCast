import { collection, getDocs, setDoc, doc, serverTimestamp, query, limit } from 'firebase/firestore';
import { db } from '../firebase';

export async function seedDatabase() {
  try {
    console.log("Checking if database needs seeding...");
    const postsSnap = await getDocs(query(collection(db, 'posts'), limit(1)));
    
    if (postsSnap.empty) {
      console.log("Database empty, seeding initial data...");
      
      const systemUid = "system_user";
      
      // Create system user profile
      await setDoc(doc(db, 'users', systemUid), {
        uid: systemUid,
        username: "trucast_official",
        displayName: "TruCast Official",
        photoURL: "https://ui-avatars.com/api/?name=TruCast&background=0066FF&color=fff",
        bio: "مرحباً بكم في TruCast! المنصة الاجتماعية الأكثر شفافية.",
        followersCount: 1,
        followingCount: 0,
        isVerified: true,
        role: "admin",
        createdAt: serverTimestamp()
      });

      // Create welcome post
      const postId = "welcome_post_1";
      await setDoc(doc(db, 'posts', postId), {
        postId: postId,
        authorId: systemUid,
        content: "مرحباً بكم جميعاً في TruCast! نحن سعداء بانضمامكم إلينا. استمتعوا بتجربة تواصل فريدة وشفافة.",
        mediaUrl: "https://images.unsplash.com/photo-1516245834210-c4c142787335?q=80&w=1000&auto=format&fit=crop",
        mediaType: "image",
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp()
      });

      // Create some initial stickers or other data if needed
      console.log("Seeding complete!");
    } else {
      console.log("Database already has data, skipping seed.");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
