package com.sana.dev.fm.utils.my_firebase;

import static com.google.common.base.Strings.isNullOrEmpty;
import static com.sana.dev.fm.utils.FmUtilize.isEmpty;

import android.app.Activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.AppConstant.Firebase;
import com.sana.dev.fm.utils.LogUtility;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class FmEpisodeCRUDImpl extends FirebaseRepository implements FmCRUD, SharedAction {

    private static final String TAG = FmEpisodeCRUDImpl.class.getSimpleName();
    private static FmEpisodeCRUDImpl instance;

    private Activity activity;
    private CollectionReference colRef;

    public static FmEpisodeCRUDImpl getInstance(Activity activity, String TableName) {
        if (instance == null) {
            instance = new FmEpisodeCRUDImpl(activity, TableName);
        }
        return instance;
    }

    public Query createSimpleQueries(String rdId) {
        CollectionReference crf = colRef.document(rdId).collection(AppConstant.Firebase.EPISODE_TABLE);
//        Query populationQuery = crf.whereGreaterThanOrEqualTo("dateTimeModel.dateEnd", /*"1662054250043"*/System.currentTimeMillis());

//        // [START fs_simple_queries]
//        // [START firestore_query_filter_single_examples]
//        Query stateQuery = cities.whereEqualTo("state", "CA");
//        Query populationQuery = cities.whereLessThan("dateTimeModel.dateEnd", System.currentTimeMillis());
//        // [END firestore_query_filter_single_examples]
//        // [END fs_simple_queries]

//        querys.add(stateQuery);
//        querys.add(populationQuery);
//        querys.add(nameQuery);
        return crf.orderBy("dateTimeModel.dateEnd", Query.Direction.DESCENDING);
    }

    public Query mainQuery(String rdId) {
        return colRef.document(rdId).collection(AppConstant.Firebase.EPISODE_TABLE)
                .whereGreaterThanOrEqualTo("dateTimeModel.dateEnd", System.currentTimeMillis())
//                .whereEqualTo("dateTimeModel.dateEnd", System.currentTimeMillis())
//                .whereEqualTo("dateTimeModel.dateEnd", System.currentTimeMillis())
                .orderBy("dateTimeModel.dateEnd", Query.Direction.DESCENDING)
                ;
    }


    public FmEpisodeCRUDImpl(Activity activity, String TableName) {
        this.activity = activity;
        colRef = FirebaseDatabaseReference.getTopLevelCollection().getFirestore().collection(TableName);
    }

    @Override
    public void create(String key, Object model, CallBack callBack) {
        Episode episode = (Episode) model;
        String pushKey = key + "__" + colRef.document().getId();
        if (episode != null && !isEmpty(pushKey)) {
            episode.setEpId(pushKey);
            DocumentReference documentReference = colRef.document(key).collection(Firebase.EPISODE_TABLE).document(pushKey);
            fireStoreCreateOrMerge(documentReference, episode, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    DocumentReference pRef = FirebaseDatabaseReference.getTopLevelCollection().getFirestore().collection(Firebase.RADIO_PROGRAM_TABLE).document(episode.getRadioId()).collection(Firebase.RADIO_PROGRAM_TABLE).document(episode.getProgramId());
                    incrementCounter("episodeCount", pRef);
                    callBack.onSuccess(AppGeneralMessage.SUCCESS);
                }

                @Override
                public void onFailure(Object object) {
                    callBack.onFailure(object);
                }
            });
        } else {
            callBack.onFailure(AppGeneralMessage.FAIL);
        }
    }


    public Query getQuery(String radioId) {
        Query query = colRef.document(radioId).collection(Firebase.EPISODE_TABLE).whereEqualTo("radioId", radioId).orderBy("epStartAt", Query.Direction.DESCENDING).limit(100);
        return query;
    }

    @Override
    public void queryAllBy(String key, Object model, CallBack callBack) {
        Query query = null;
        if (model != null) {
            Episode episode = (Episode) model;
            query = colRef.document(episode.getRadioId()).collection(Firebase.EPISODE_TABLE).whereEqualTo("radioId", episode.getRadioId()).whereEqualTo("programId", episode.getProgramId());
        } else if (!isNullOrEmpty(key)) {
            query = mainQuery(key);
        }

        if (query != null) {
            readQueryDocuments(query, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    if (object != null) {
                        callBack.onSuccess(getDataFromQuerySnapshot(object));
                    } else
                        callBack.onSuccess(null);
                }

                @Override
                public void onFailure(Object object) {
                    callBack.onFailure(object);
                }
            });
        } else {
            callBack.onFailure(AppGeneralMessage.FAIL);
        }

    }

    @Override
    public void queryAllByKeyValue(@NonNull String field, @Nullable Object value, Object model, CallBack callBack) {

    }


    @Override
    public void update(String key, Object model, CallBack callBack) {
    }

    public void updateLike(Object model, CallBack callBack){
        Episode episode = (Episode) model;
        Map<String, Object> docData = new HashMap<>();
        docData.put("episodeLikes", episode.getEpisodeLikes());
        DocumentReference documentReference = colRef.document(episode.getRadioId()).collection(Firebase.EPISODE_TABLE).document(episode.getEpId());
        fireStoreCreateOrMerge(documentReference, docData, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                callBack.onSuccess(AppGeneralMessage.SUCCESS);
            }

            @Override
            public void onFailure(Object object) {
                callBack.onFailure(object);
            }
        });
    }

    public void updateEpisodeState(Object model, CallBack callBack) {
        Episode episode = (Episode) model;
        Map<String, Object> docData = new HashMap<>();
        docData.put("disabled", episode.isDisabled());
        DocumentReference documentReference = colRef.document(episode.getRadioId()).collection(Firebase.EPISODE_TABLE).document(episode.getEpId());
        fireStoreCreateOrMerge(documentReference, docData, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                callBack.onSuccess(AppGeneralMessage.SUCCESS);
            }

            @Override
            public void onFailure(Object object) {
                callBack.onFailure(object);
            }
        });
    }

    @Override
    public void delete(Object model, CallBack callBack) {
        Episode episode = (Episode) model;
        if (!isEmpty(episode.getEpId()) && !isEmpty(episode.getRadioId())) {
            DocumentReference documentReference = colRef.document(episode.getRadioId()).collection(Firebase.EPISODE_TABLE).document(episode.getEpId());

            fireStoreDelete(documentReference, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    callBack.onSuccess(AppGeneralMessage.SUCCESS);
                }

                @Override
                public void onFailure(Object object) {
                    callBack.onFailure(object);
                }
            });
        } else {
            callBack.onFailure(AppGeneralMessage.FAIL);
        }
    }


    public List<Episode> getDataFromQuerySnapshot(Object object) {
        List<Episode> programList = new ArrayList<>();
        try {
            QuerySnapshot queryDocumentSnapshots = (QuerySnapshot) object;
            for (DocumentSnapshot snapshot : queryDocumentSnapshots) {
                Episode program = snapshot.toObject(Episode.class);
                if (program != null && !program.isDisabled()) {
                    programList.add(program);
                }
            }
        } catch (Exception e) {
            LogUtility.e(TAG, " getDataFromQuerySnapshot: " + object, e);
        }
        return programList;
    }

//        private boolean isPostValid(Map<String, Object> post) {
//        return post.containsKey("title")
//                && post.containsKey("description")
//                && post.containsKey("imageTitle")
//                && post.containsKey("authorId");
//    }

}