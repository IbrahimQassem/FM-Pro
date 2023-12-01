package com.sana.dev.fm.utils.my_firebase;

import static com.sana.dev.fm.utils.my_firebase.AppConstant.SUCCESS;
import static com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference.DATABASE;

import android.app.Activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QueryDocumentSnapshot;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.utils.LogUtility;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class FmStationCRUDImpl extends FirebaseRepository implements FmCRUD {
    public static final String TAG = FmStationCRUDImpl.class.getSimpleName();

    private Activity activity;
    private CollectionReference colRef;

    public FmStationCRUDImpl(Activity activity, String TableName) {
        this.activity = activity;
        colRef = DATABASE.collection(TableName);
    }


    @Override
    public void create(String key, Object model, CallBack callBack) {

    }

    @Override
    public void update(String key, Object model, CallBack callBack) {
//        RadioInfo radioInfo = (RadioInfo) model;
//        Map<String, Object> updates = new HashMap<>();
//        updates.put(key, radioInfo.getPriority());
////        Gson gson = new GsonBuilder().setPrettyPrinting().create();
////        JsonElement element = gson.fromJson(radioInfo.toString(), JsonElement.class);
////        JsonObject jsonObj = element.getAsJsonObject();
////        Map<String, Object> resultMap = new Gson().fromJson(jsonObj, Map.class);
////        Map<String, Object> resultMap = convertModelToMap(radioInfo);
//
////        DocumentReference documentReference = colRef.document(radioInfo.getRadioId()).collection(FirebaseConstants.RADIO_INFO_TABLE).document(radioInfo.getEpId());
////        DocumentReference documentReference = colRef.document(key).collection(RADIO_INFO_TABLE).document(key);
//        DocumentReference documentReference = colRef.document(radioInfo.getRadioId());
//        fireStoreUpdate(documentReference, updates, new CallBack() {
//            @Override
//            public void onSuccess(Object object) {
//                callBack.onSuccess(SUCCESS);
//            }
//
//            @Override
//            public void onError(Object object) {
//                callBack.onError(object);
//            }
//        });

    }

   public void toggleRadioAvailability(boolean radioState,Object model, CallBack callBack){
        RadioInfo radioInfo = (RadioInfo) model;
        Map<String, Object> updates = new HashMap<>();
        updates.put("disabled", radioState);
        DocumentReference documentReference = colRef.document(radioInfo.getRadioId());
        fireStoreUpdate(documentReference, updates, new CallBack() {
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


   public void changePriority(Object model, CallBack callBack){
        RadioInfo radioInfo = (RadioInfo) model;
        Map<String, Object> updates = new HashMap<>();
        updates.put("priority", radioInfo.getPriority());
        DocumentReference documentReference = colRef.document(radioInfo.getRadioId());
        fireStoreUpdate(documentReference, updates, new CallBack() {
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

    public Map<String, Object> convertModelToMap(Object model) {
        Map<String, Object> map = new HashMap<>();

        // Get the class of the model object
        Class<?> clazz = model.getClass();

        // Get all the declared fields of the class
        Field[] fields = clazz.getDeclaredFields();

        try {
            for (Field field : fields) {
                // Set the field accessible to extract its value
                field.setAccessible(true);

                // Get the field name
                String fieldName = field.getName();

                // Get the field value from the model object
                Object fieldValue = field.get(model);

                // Add the field name and value to the map
                map.put(fieldName, fieldValue);
            }
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }

        return map;
    }

/*    @Override
    public void update(String key, Object model, CallBack callBack) {
        if (!isEmpty(key)) {
            DocumentReference documentReference = colRef.document(key).collection(RADIO_INFO_TABLE).document(key);
            RadioInfo radioInfo = (RadioInfo) model;

            arrayUpdate(documentReference, key, (Map<String, Object>) radioInfo, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    callBack.onSuccess(SUCCESS);
                }

                @Override
                public void onError(Object object) {
                    callBack.onError(object);
                }
            });
        } else {
            callBack.onError(FAIL);
        }
    }*/

/*
    @Override
    public void update(String key, Object model, CallBack callBack) {
        if (!isEmpty(key)) {
            RadioInfo radioInfo = (RadioInfo) model;
            Map<String,Object> resultMap = new Gson().fromJson(radioInfo, RadioInfo.class);

            Map<String,Object> resultMap = radioInfo.toJSON();

            DocumentReference documentReference = colRef.document(key).collection(RADIO_INFO_TABLE).document(key);
            arrayUpdate(documentReference, key, (Map<String, Object>) model, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    callBack.onSuccess(SUCCESS);
                }

                @Override
                public void onError(Object object) {
                    callBack.onError(object);
                }
            });
        } else {
            callBack.onError(FAIL);
        }
    }
*/

    @Override
    public void delete(Object key, CallBack callBack) {

    }

    @Override
    public void queryAllBy(String key, Object model, CallBack callBack) {
        try {
            Query query = colRef.orderBy("priority", Query.Direction.DESCENDING);
            readQueryDocuments(query, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    LogUtility.d(TAG, " queryAllBy :  " + object);
                    if (object != null) {
                        callBack.onSuccess(getRIDataFromQuerySnapshot(object));
                    } else
                        callBack.onSuccess(null);
                }

                @Override
                public void onError(Object object) {
                    LogUtility.e(TAG, " queryAllBy :  " + object);
                    callBack.onError(object);
                }
            });
        } catch (Exception e) {
            LogUtility.e(LogUtility.tag(FmStationCRUDImpl.class), e.toString());
        }

    }

    @Override
    public void queryAllByKeyValue(@NonNull String field, @Nullable Object value, Object model, CallBack callBack) {

    }


    public List<RadioInfo> getRIDataFromQuerySnapshot(Object object) {
        List<RadioInfo> programList = new ArrayList<>();
        try {
            QuerySnapshot queryDocumentSnapshots = (QuerySnapshot) object;
            for (DocumentSnapshot snapshot : queryDocumentSnapshots) {
                RadioInfo program = snapshot.toObject(RadioInfo.class);
                if (!program.isDisabled())
                    programList.add(program);
            }
        } catch (Exception e) {
            LogUtility.e(LogUtility.tag(FmStationCRUDImpl.class), e.toString());
        }
        return programList;
    }

    public void queryAll(CallBack callBack) {
        try {

            CollectionReference collectionRef = colRef;
            // Query documents in the collection
            collectionRef
                    .get()
                    .addOnSuccessListener(new OnSuccessListener<QuerySnapshot>() {
                        @Override
                        public void onSuccess(QuerySnapshot querySnapshot) {
                            // Documents retrieved successfully
                            List<RadioInfo> radioInfoList = new ArrayList<>();
                            for (QueryDocumentSnapshot document : querySnapshot) {
                                String documentId = document.getId();
                                Map<String, Object> documentData = document.getData();
                                // Do something with the document data
                                RadioInfo radioInfo = document.toObject(RadioInfo.class);
                                radioInfoList.add(radioInfo);
                            }
                            callBack.onSuccess(radioInfoList);
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            // Error occurred while retrieving documents
                            callBack.onError(e.toString());
                        }
                    });

//            DocumentReference documentReference = colRef.document();
//            readDocumentByListener(documentReference, new CallBack() {
//                @Override
//                public void onSuccess(Object object) {
//                    if (object != null) {
//                        callBack.onSuccess(getRIDataFromQuerySnapshot(object));
//                    } else
//                        callBack.onSuccess(null);
//                }
//
//                @Override
//                public void onError(Object object) {
//                    callBack.onError(object);
//                }
//            });
        } catch (Exception e) {
            LogUtility.e(LogUtility.tag(FmStationCRUDImpl.class), e.toString());
        }

    }

}


