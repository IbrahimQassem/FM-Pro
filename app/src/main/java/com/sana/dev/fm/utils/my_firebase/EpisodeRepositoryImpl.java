package com.sana.dev.fm.utils.my_firebase;

import android.app.Activity;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.utils.ProgressHUD;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.google.common.base.Strings.isNullOrEmpty;
import static com.sana.dev.fm.utils.FmUtilize.isEmptyOrNull;
import static com.sana.dev.fm.utils.my_firebase.AppConstant.FAIL;
import static com.sana.dev.fm.utils.my_firebase.AppConstant.SUCCESS;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.EPISODE_TABLE;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.RADIO_PROGRAM_TABLE;
import static com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference.DATABASE;


interface EpisodeRepository {
    void createEpi(String riId, String rpId, Episode episode, CallBack callBack);
//    void readAllEpisodeByRadioId(String rdId, CallBack callBack);
    void reaDailyEpisodeByRadioId(String rdId, CallBack callBack);
    void readAllEpisodeByRadioIdAndPgId(Episode episode, CallBack callBack);


   void updateEpi( String valueKey, Episode episode, CallBack callBack);
    void deleteEpi(Episode episode, CallBack callBack);

}

public class EpisodeRepositoryImpl extends FirebaseRepository implements EpisodeRepository, SharedAction {

    private static final String TAG = EpisodeRepositoryImpl.class.getSimpleName();
    private static EpisodeRepositoryImpl instance;

    private Activity activity;
    private CollectionReference colRef;

    public static EpisodeRepositoryImpl getInstance(Activity activity, String TableName) {
        if (instance == null) {
            instance = new EpisodeRepositoryImpl(activity,TableName);
        }
        return instance;
    }

    public  Query mainQuery(String rdId){
        return colRef.document(rdId).collection(EPISODE_TABLE)
                .whereGreaterThanOrEqualTo("dateTimeModel.dateEnd", System.currentTimeMillis())
//                .whereEqualTo("dateTimeModel.dateEnd", System.currentTimeMillis())
//                .whereEqualTo("dateTimeModel.dateEnd", System.currentTimeMillis())
                .orderBy("dateTimeModel.dateEnd", Query.Direction.DESCENDING)
        ;
//        citiesRef.whereGreaterThanOrEqualTo("state", "CA")
//                .whereLessThanOrEqualTo("state", "IN");
//        citiesRef.whereEqualTo("state", "CA")
//                .whereGreaterThan("population", 1000000);
    }




    public EpisodeRepositoryImpl(Activity activity, String TableName) {
        this.activity = activity;
        colRef = DATABASE.collection(TableName);
    }


    @Override
    public void createEpi(String riId, String rpId, Episode episode, CallBack callBack) {
        String pushKey = riId + "__" + colRef.document().getId();
        if (episode != null && !isEmptyOrNull(pushKey)) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

            episode.setEpId(pushKey);
            DocumentReference documentReference = colRef.document(riId).collection(EPISODE_TABLE).document(pushKey);

            fireStoreCreateOrMerge(documentReference, episode, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    mProgressHUD.dismiss();
                    DocumentReference pRef = DATABASE.collection(RADIO_PROGRAM_TABLE).document(episode.getRadioId()).collection(RADIO_PROGRAM_TABLE).document(episode.getProgramId());
                    incrementCounter("episodeCount", pRef);

                    callBack.onSuccess(SUCCESS);
                }

                @Override
                public void onError(Object object) {
                    mProgressHUD.dismiss();
                    callBack.onError(object);
                }
            });
        } else {
            callBack.onError(FAIL);
        }
    }


    public Query getQuery(String radioId) {
        Query query = colRef.document(radioId).collection(EPISODE_TABLE).whereEqualTo("radioId", radioId).orderBy("epStreamUrl", Query.Direction.DESCENDING).orderBy("epStartAt", Query.Direction.DESCENDING).limit(100);
        return  query;
    }


//    @Override
//    public void readAllEpisodeByRadioId(String rdId, final CallBack callBack) {
//        if (!Utility.isNullOrEmpty(rdId)) {
////            ProgressHUD mProgressHUD = ProgressHUD.show(activity, getString(R.string.please_wait), true, false, null);
////            Query query = colRef.document(rdId).collection(EPISODE_TABLE).whereEqualTo("radioId", rdId).limit(100);
//            Query query = colRef.document(rdId).collection(EPISODE_TABLE).whereEqualTo("radioId", rdId).orderBy("epStreamUrl", Query.Direction.DESCENDING).orderBy("epStartAt", Query.Direction.DESCENDING).limit(100);
//
////            Query query = colRef.document(rdId).collection(EPISODE_TABLE).whereEqualTo("radioId", rdId).orderBy("epStartAt", Query.Direction.DESCENDING).limit(100);
//            readQueryDocuments(query, new CallBack() {
//                @Override
//                public void onSuccess(Object object) {
//                    if (object != null) {
//                        /*
//                         *Here we episode data order by created tade in ASCENDING ORDER
//                         */
//                        callBack.onSuccess(getDataFromQuerySnapshot(object));
//                    } else
//                        callBack.onSuccess(null);
////                    mProgressHUD.dismiss();
//                }
//
//                @Override
//                public void onError(Object object) {
////                    mProgressHUD.dismiss();
//                    callBack.onError(object);
//                }
//            });
//        } else {
//            callBack.onError(FAIL);
//        }
//    }


    @Override
    public void reaDailyEpisodeByRadioId(String rdId, CallBack callBack) {
        if (!isEmptyOrNull(rdId)) {
//            Date start = Tools.getDateFromString(System.currentTimeMillis() % 1000); // ٠١/٠١/١٩٧٠
//            Date end = Tools.getDateFromString(System.currentTimeMillis()); // today : ٠٦/١٦/٢٠٢١
//            ProgressHUD mProgressHUD = ProgressHUD.show(activity, getString(R.string.please_wait), true, false, null);//             Timestamp timestamp = new Timestamp(new Date());



//            colRef.document(rdId).collection(EPISODE_TABLE)
//                    .whereLessThan("dateTimeModel.dateEnd", new Date())
//                    .whereLessThan("dateTimeModel.dateEnd", end)
//            colRef.document(rdId).collection(EPISODE_TABLE) //Added both children
//                    .orderBy("dateTimeModel.dateEnd")
//                    .startAfter(start)
//                    .endBefore(end)
//            colRef.document(rdId).collection(EPISODE_TABLE)
//                    .whereGreaterThanOrEqualTo("dateTimeModel.dateEnd", System.currentTimeMillis())
//                    .orderBy("dateTimeModel.dateEnd", Query.Direction.DESCENDING)
//                    .get()
//                    .addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
//                        @Override
//                        public void onComplete(@NonNull Task<QuerySnapshot> task) {
//                            if (task.isSuccessful()) {
//                                QuerySnapshot querySnapshot = task.getResult();
//                                if (querySnapshot != null && !querySnapshot.isEmpty()) {
//                                    callBack.onSuccess(querySnapshot);
//                                   Object pObject = getDataFromQuerySnapshot(querySnapshot);
////                                    Episode ep = (Episode) pObject;
//                                    LogUtility.e(TAG, "data :  " +pObject);
//
//                                } else {
//                                    callBack.onSuccess(null);
//                                }
//                            } else {
//                                callBack.onError(task.getException());
//                            }
//
//                        }
//                    });

            readQueryDocuments(mainQuery(rdId), new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    if (object != null) {
                        callBack.onSuccess(getDataFromQuerySnapshot(object));
                    } else
                        callBack.onSuccess(null);
//                    mProgressHUD.dismiss();
                }

                @Override
                public void onError(Object object) {
//                    mProgressHUD.dismiss();
                    callBack.onError(object);
                }
            });
        } else {
            callBack.onError(FAIL);
        }
    }

    @Override
    public void readAllEpisodeByRadioIdAndPgId(Episode episode, CallBack callBack) {
        if (!isNullOrEmpty(episode.getRadioId()) || !isNullOrEmpty(episode.getProgramId())) {
//            ProgressHUD mProgressHUD = ProgressHUD.show(activity, getString(R.string.please_wait), true, false, null);
//            Query query = colRef.document(episode.getRadioId()).collection(EPISODE_TABLE).whereEqualTo("radioId", episode.getRadioId()).whereEqualTo("programId", episode.getProgramId()).orderBy("epStartAt", Query.Direction.DESCENDING);
            Query query = colRef.document(episode.getRadioId()).collection(EPISODE_TABLE).whereEqualTo("radioId", episode.getRadioId()).whereEqualTo("programId", episode.getProgramId());
            readQueryDocuments(query, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    if (object != null) {
                        callBack.onSuccess(getDataFromQuerySnapshot(object));
                    } else
                        callBack.onSuccess(null);
//                    mProgressHUD.dismiss();
                }

                @Override
                public void onError(Object object) {
//                    mProgressHUD.dismiss();
                    callBack.onError(object);
                }
            });
        } else {
            callBack.onError(FAIL);
        }
    }




    @Override
    public void updateEpi( String valueKey, Episode episode, CallBack callBack) {

        Map<String, Object> docData = new HashMap<>();
        docData.put(valueKey, episode.getEpisodeLikes());

        DocumentReference documentReference = colRef.document(episode.getRadioId()).collection(EPISODE_TABLE).document(episode.getEpId());

        fireStoreCreateOrMerge(documentReference, docData, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                callBack.onSuccess(SUCCESS);
            }

            @Override
            public void onError(Object object) {
                callBack.onError(object);
            }
        });
    }


    @Override
    public void deleteEpi(Episode episode, final CallBack callBack) {
        if (!isEmptyOrNull(episode.getEpId()) && !isEmptyOrNull(episode.getRadioId())) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

            DocumentReference documentReference = colRef.document(episode.getRadioId()).collection(EPISODE_TABLE).document(episode.getEpId());

            fireStoreDelete(documentReference, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    mProgressHUD.dismiss();
                    callBack.onSuccess(SUCCESS);
                }

                @Override
                public void onError(Object object) {
                    mProgressHUD.dismiss();
                    callBack.onError(object);
                }
            });
        } else {
            callBack.onError(FAIL);
        }
    }


    private String getString(int id) {
        return activity.getString(id);
    }

    public List<Episode> getDataFromQuerySnapshot(Object object) {
        List<Episode> programList = new ArrayList<>();
        QuerySnapshot queryDocumentSnapshots = (QuerySnapshot) object;
        for (DocumentSnapshot snapshot : queryDocumentSnapshots) {
            Episode program = snapshot.toObject(Episode.class);
            programList.add(program);
        }
        return programList;
    }

    public boolean isLikeValid(Map<String, Object> post) {
        return post.containsKey("isLiked");
    }
//        private boolean isPostValid(Map<String, Object> post) {
//        return post.containsKey("title")
//                && post.containsKey("description")
//                && post.containsKey("imageTitle")
//                && post.containsKey("authorId");
//    }

}