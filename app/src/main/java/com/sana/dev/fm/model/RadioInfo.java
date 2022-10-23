package com.sana.dev.fm.model;


import android.content.Context;
import android.widget.Toast;

import com.google.android.gms.tasks.OnSuccessListener;
import com.google.firebase.firestore.DocumentId;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.Exclude;
import com.google.firebase.firestore.ServerTimestamp;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;
import com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;

public class RadioInfo implements Serializable {

    private int id;
    @DocumentId
    private String radioId;
    private String name, desc, streamUrl, logo, tag, city, channelFreq, enName, createBy, timestamp;
    private int programsCount, followers, subscribers, rating, priority;

    @ServerTimestamp
    private Date createdDate;
    private boolean isOnline, disabled;


    public RadioInfo() {

    }

    public RadioInfo(String radioId, String name, String desc, String streamUrl, String logo, String tag, int programs, int followers, int subscribers, int rating, int priority, Date createdDate, boolean isOnline, boolean disabled, String city, String channelFreq, String enName, String createBy, String timestamp) {
        this.radioId = radioId;
        this.name = name;
        this.desc = desc;
        this.streamUrl = streamUrl;
        this.logo = logo;
        this.tag = tag;
        this.programsCount = programs;
        this.followers = followers;
        this.subscribers = subscribers;
        this.rating = rating;
        this.priority = priority;
        this.createdDate = createdDate;
        this.isOnline = isOnline;
        this.disabled = disabled;
        this.city = city;
        this.channelFreq = channelFreq;
        this.enName = enName;
        this.createBy = createBy;
        this.timestamp = timestamp;
    }

    public static RadioInfo newInstance(String radioId, String name, String desc, String streamUrl, String logo, String tag, String city, String channelFreq, String enName, String createBy, boolean disabled) {
        return new RadioInfo(radioId, name, desc, streamUrl, logo, tag, 1, 1, 1, 1, 1, new Date(), false, disabled, city, channelFreq, enName, createBy, Tools.getFormattedDateSimple(new Date().getTime()));
    }


    @Exclude
    @Override
    public String toString() {
        return name;
    }

    public RadioInfo findRadio(String RadioId, List<RadioInfo> radios) {
        // Goes through the List .
        for (RadioInfo i : radios) {
            if (i.getRadioId().equals(RadioId)) {
                return i;
            }
        }
        return null;
    }

    public interface IPredicate<T> {
        boolean apply(T type);
    }

    public static <T> Collection<T> filter(Collection<T> target, IPredicate<T> predicate) {
        Collection<T> result = new ArrayList<T>();
        for (T element : target) {
            if (predicate.apply(element)) {
                result.add(element);
            }
        }
        return result;
    }

    public void createRadio(Context context) {

        PreferencesManager prefMgr = PreferencesManager.getInstance();

        if (prefMgr.getUserSession() == null)
            return;
        String usId = prefMgr.getUserSession().getUserId();
        RadioInfo radio1 = RadioInfo.newInstance("1001", "يمن", "", "http://93.190.141.15:7183/live", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1001%2F1001.jpg?alt=media&token=41d7cab7-d1cf-4d10-840a-dd576c04871a", "@yemen_fm", "صنعاء", "99,9", "Yemen Fm", usId, false);
        RadioInfo radio2 = RadioInfo.newInstance("1002", "أصالة", "", "https://streamingv2.shoutcast.com/assala-fm", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1002%2Fmicar.jpg?alt=media&token=b568c461-9563-44e2-a091-e953471e42c4", "@asalah_fm", "صنعاء", "87.9", "Asalah Fm", usId, true);
        RadioInfo radio3 = RadioInfo.newInstance("1003", "صوت اليمن", " إذاعة حرة ومستقله بقدرات وأصوات يمنية 100%", "", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1003%2F1003.jpg?alt=media&token=004920e1-edac-4b9f-9182-b670ecc3f9bc", "@yemenvoicefm", "صنعاء", "98.1", "Yemen Voice Fm", usId, false);
        RadioInfo radio4 = RadioInfo.newInstance("1004", "طيرمانة", "", "", "", "@tairmanah_fm", "صنعاء", "101.10", "Tayramana Fm", usId, true);
        RadioInfo radio5 = RadioInfo.newInstance("1005", "سمارة", "", "https://l.facebook.com/l.php?u=https%3A%2F%2Feu2-centova.serverse.com%2Fproxy%2Fjgbhsvbc%3Fmp%3D%252Fstream%26fbclid%3DIwAR3hJ7WE0bkmPDbG2f5rloNYtj397px_W5dDlvmqj208WIsClSpmhf1cSs8&h=AT2zEq4uMVih-kAU688J-JUvuTgElJRGXW-t9sUlLVx095lTk0e_WuHBSqW7adckomMfLg4O3hyoyXrsFDvw9JvIzSA4RClokIQlbHxV7GHt82eQEKk2U2Ei5V2LVpHSgw0xuA", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1005%2F1005.jpg?alt=media&token=92224654-c283-4481-9abb-4bfe1f4c8ae8", "@somarafm", "إب", "100.3", "Somara Fm", usId, true);
//        RadioInfo radio6 = RadioInfo.newInstance("1006", "دلتا", "", "http://108.61.34.50:7057/live", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1006%2F71.jpg?alt=media&token=3066d8c6-7b10-4abb-9ac8-18a33ca8ea9e", "@delta_fm", "صنعاء", "101.90", "Delta Fm", usId, false);
//        RadioInfo radio7 = RadioInfo.newInstance("1007", "يمن تايمز", "", "https://mixlr.com/yemen-times-radio/?fbclid=IwAR3nMTVShHd5IUYobKfUy5nDZsuSZpyZuS8TUNmzx4InxV02RIBJX3x6KVs", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1007%2F.jpg?alt=media&token=ce075b57-0339-43ee-b330-14a00c4164f3", "@yemen_times_fm", "صنعاء", "91.90", "Yemen Times Fm", usId, false);
//        RadioInfo radio8 = RadioInfo.newInstance("1008", "الهوية", "", "", "", "@hwiah_fm", "صنعاء", "100.70", "Alhwiah Fm", usId, true);
//        RadioInfo radio9 = RadioInfo.newInstance("1009", "سام", "سام fm  إذاعة يمنية حرّة متنوعة تعمل على رفع وعي المجتمع اليمني وتبنّي قضاياه الوطنية والعربية والإسلامية بأسلوب عصري متفرّد", "https://worldradiomap.com/ye/play/sam", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1009%2F1009.jpg?alt=media&token=4bca59c0-5fc0-40fc-8a92-52a6df270a96", "@sam_fm", "صنعاء", "99.10", "Sam Fm", usId, true); //http://edge.mixlr.com/channel/kijwr
//        RadioInfo radio10 = RadioInfo.newInstance("1010", "جراند", "جراند إف إم .. مزاجك هوانا", "", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1010%2F1010.jpg?alt=media&token=300bb1b8-2b5c-4279-b8ed-1a47fd976dbb", "@grand_fm", "صنعاء", "93.90", "Grand Fm", usId, true);
//        RadioInfo radio11 = RadioInfo.newInstance("1011", "إرام", "إيرام هي إذاعة فنية ترفيهية واجتماعية تهتم بالتنمية ، ونهتم من خلالها بإبراز الفنون اليمنية الشعبية المختلفة", "http://icecast2.edisimo.com:8000/eramfm.mp3", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1011%2F11914110_1684512855103921_3973523970433273295_n.jpg?alt=media&token=1005853e-c0e9-4171-ac70-d3f338fea743", "@eram_fm", "صنعاء","94.9","Eram Fm",usId,true);
//        RadioInfo radio12 = RadioInfo.newInstance("1012", "الأولى", "محطة إذاعية تبث عبر الموجة 102.3 إف إم، أجتماعية،زراعية،شبابية، ويغطي نطاق بثها عدد من المحافظات اليمنية.", "", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1012%2F171766641_2979218468974743_5421854361771074385_n.jpg?alt=media&token=9ece3e28-ca1c-44a9-b584-92900f4171af", "@alaola_fm", "صنعاء","102.03","Alaola Fm",usId,true);
//        RadioInfo radio13 = RadioInfo.newInstance("1013", "يمن ميوزك", "بنكهةٍ أُخرى بِأجواء مغايرة خالية من الكوليسترول يمن ميوزيك.. تضيف لوناً جديداً", "", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1013%2F10942578_1552244068359404_5650426771712046487_o.jpg?alt=media&token=2951e6e6-45ff-4f18-8c0a-75a8a5b8b3ad", "@yemen_music_fm", "صنعاء","90.9","Yemen Music Fm",usId,true);
//        RadioInfo radio14 = RadioInfo.newInstance("1014", "هوا اليمن", "", "", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1014%2F1014.png?alt=media&token=c91b04a4-592e-45a0-a8a3-3a0f45623954", "@hawaalyemen_fm", "صنعاء","88.3","Hawa Al Yemen Fm",usId,true);
//        RadioInfo radio15 = RadioInfo.newInstance("1015", "بانوراما", "إذاعة بانوراما أف أم يمن ،، إذاعة ثقافية فنية إجتماعية ،، تبث ..على تردد 91.5 أف أم", "", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1015%2F1015.jpg?alt=media&token=a7bd3aec-d1f3-4256-8fb6-3c754a46d188", "@panorama_fm", "صنعاء", "91.5", "Panorama Fm", usId, true);
//        RadioInfo radio16 = RadioInfo.newInstance("1016", "ألوان", "إذاعة مجتمعية فنية", "", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1016%2F1016.jpg?alt=media&token=ac855c80-9f3f-4a6b-858d-6d136c9092fb", "@alwan_fm", "صنعاء","88.7","Alwan Fm",usId,true);
//        RadioInfo radio0 = RadioInfo.newInstance("0000", "يمن تايمز", "", "", "", "@yemen_times_fm", "صنعاء","91.90","Yemen Times Fm",usId,true);
//        RadioInfo radio17 = RadioInfo.newInstance("1017", "temp", "", "", "", "@", "","","",usId,true);
//        RadioInfo radio18 = RadioInfo.newInstance("1018", "temp", "", "", "", "@", "","","",usId,true);
//        RadioInfo radio19 = RadioInfo.newInstance("1019", "temp", "", "", "", "@", "","","",usId,true);
//        RadioInfo radio20 = RadioInfo.newInstance("1020", "temp", "", "", "", "@", "","","",usId,true);
//        RadioInfo radio21 = RadioInfo.newInstance("1021", "temp", "", "", "", "@", "","","",usId,true);
//        RadioInfo radio22 = RadioInfo.newInstance("1022", "temp", "", "", "", "@", "","","",usId,true);
//        RadioInfo radio23 = RadioInfo.newInstance("1023", "temp", "", "", "", "@", "","","",usId,true);
//        RadioInfo radio24 = RadioInfo.newInstance("1024", "temp", "", "", "", "@", "","","",usId,true);
//        RadioInfo radio25 = RadioInfo.newInstance("1025", "temp", "", "", "", "@", "","","",usId,true);
//        RadioInfo radio26 = RadioInfo.newInstance("1026", "temp", "", "", "", "@", "","","",usId,true);
//        RadioInfo radio27 = RadioInfo.newInstance("1027", "temp", "", "", "", "@", "","","",usId,true);


        List<RadioInfo> infos = new ArrayList<>();
        infos.add(radio1);
        infos.add(radio2);
        infos.add(radio3);
        infos.add(radio4);
        infos.add(radio5);
//        infos.add(radio6);
//        infos.add(radio7);
//        infos.add(radio8);
//        infos.add(radio9);
//        infos.add(radio10);
//        infos.add(radio11);
//        infos.add(radio12);
//        infos.add(radio13);
//        infos.add(radio14);
//        infos.add(radio15);
//        infos.add(radio16);
//        infos.add(radio17);
//        infos.add(radio18);
//        infos.add(radio19);
//        infos.add(radio20);
//        infos.add(radio21);
//        infos.add(radio22);
//        infos.add(radio23);
//        infos.add(radio24);
//        infos.add(radio25);
//        infos.add(radio26);
//        infos.add(radio27);


        if (!infos.isEmpty()) {
            for (int i = 0; i < infos.size(); i++) {
                RadioInfo info = infos.get(i);
                DocumentReference mFirestoreProfiles1 = FirebaseDatabaseReference.DATABASE.collection(FirebaseConstants.RADIO_INFO_TABLE).document(info.getRadioId());

                mFirestoreProfiles1.set(info).addOnSuccessListener(new OnSuccessListener<Void>() {
                    @Override
                    public void onSuccess(Void aVoid) {
                        Toast.makeText(context, info.getName() + " inserted successfully!", Toast.LENGTH_SHORT).show();
                    }
                });

            }
        } else {
            Toast.makeText(context, " No Radio Info !", Toast.LENGTH_SHORT).show();
        }


    }


    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getRadioId() {
        return radioId;
    }

    public void setRadioId(String radioId) {
        this.radioId = radioId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDesc() {
        return desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    public String getStreamUrl() {
        return streamUrl;
    }

    public void setStreamUrl(String streamUrl) {
        this.streamUrl = streamUrl;
    }

    public String getLogo() {
        return logo;
    }

    public void setLogo(String logo) {
        this.logo = logo;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public int getProgramsCount() {
        return programsCount;
    }

    public void setProgramsCount(int programsCount) {
        this.programsCount = programsCount;
    }

    public int getFollowers() {
        return followers;
    }

    public void setFollowers(int followers) {
        this.followers = followers;
    }

    public int getSubscribers() {
        return subscribers;
    }

    public void setSubscribers(int subscribers) {
        this.subscribers = subscribers;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public Date getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(Date createdDate) {
        this.createdDate = createdDate;
    }

    public boolean isOnline() {
        return isOnline;
    }

    public void setOnline(boolean online) {
        isOnline = online;
    }

    public boolean isDisabled() {
        return disabled;
    }

    public void setDisabled(boolean disabled) {
        this.disabled = disabled;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getChannelFreq() {
        return channelFreq;
    }

    public void setChannelFreq(String channelFreq) {
        this.channelFreq = channelFreq;
    }

    public String getEnName() {
        return enName;
    }

    public void setEnName(String enName) {
        this.enName = enName;
    }

    public String getCreateBy() {
        return createBy;
    }

    public void setCreateBy(String createBy) {
        this.createBy = createBy;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

}

