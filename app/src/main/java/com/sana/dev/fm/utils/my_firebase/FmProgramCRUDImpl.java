//package com.sana.dev.fm.utils.my_firebase;
//
//import static com.google.common.base.Strings.isNullOrEmpty;
//import static com.sana.dev.fm.utils.AppConstant.Firebase.RADIO_PROGRAM_TABLE;
//import static com.sana.dev.fm.utils.FmUtilize.isEmpty;
//
//import android.app.Activity;
//
//import androidx.annotation.NonNull;
//import androidx.annotation.Nullable;
//
//import com.google.firebase.firestore.CollectionReference;
//import com.google.firebase.firestore.DocumentReference;
//import com.google.firebase.firestore.DocumentSnapshot;
//import com.google.firebase.firestore.Query;
//import com.google.firebase.firestore.QuerySnapshot;
//import com.sana.dev.fm.model.RadioProgram;
//import com.sana.dev.fm.utils.LogUtility;
//
//import java.util.ArrayList;
//import java.util.List;
//import java.util.Map;
//
//
//public class FmProgramCRUDImpl extends FirebaseRepository implements FmCRUD<RadioProgram> {
//    public static final String TAG = FmProgramCRUDImpl.class.getSimpleName();
//
//    private Activity activity;
//    private CollectionReference colRef;
//
//    public FmProgramCRUDImpl(Activity activity, String TableName) {
//        this.activity = activity;
//        colRef = FirebaseDatabaseReference.getTopLevelCollection().document().collection(TableName);
//    }
//
//
//    @Override
//    public void create(String key, RadioProgram model, CallBack callBack) {
//        String pushKey = colRef.document().getId();
//        if (!isEmpty(key) && model != null) {
//            RadioProgram program = (RadioProgram) model;
//
//            program.setRadioId(key);
//            program.setProgramId(pushKey);
//            DocumentReference documentReference = colRef.document(key).collection(RADIO_PROGRAM_TABLE).document(pushKey);
//            fireStoreCreate(documentReference, program, new CallBack() {
//                @Override
//                public void onSuccess(Object object) {
//                    callBack.onSuccess(AppGeneralMessage.SUCCESS);
//                }
//
//                @Override
//                public void onFailure(Object object) {
//                    callBack.onFailure(object);
//                }
//            });
//        } else {
//            callBack.onFailure(AppGeneralMessage.FAIL);
//        }
//    }
//
//    @Override
//    public void update(String key, RadioProgram model, CallBack callBack) {
//        if (!isEmpty(key)) {
//
//            DocumentReference documentReference = colRef.document(key).collection(RADIO_PROGRAM_TABLE).document(key);
//
//            arrayUpdate(documentReference, key, (Map<String, Object>) model, new CallBack() {
//                @Override
//                public void onSuccess(Object object) {
//                    callBack.onSuccess(AppGeneralMessage.SUCCESS);
//                }
//
//                @Override
//                public void onFailure(Object object) {
//                    callBack.onFailure(object);
//                }
//            });
//        } else {
//            callBack.onFailure(AppGeneralMessage.FAIL);
//        }
//    }
//
//    @Override
//    public void delete(RadioProgram model, CallBack callBack) {
//        if (model != null) {
//            DocumentReference documentReference = colRef.document(model.getRadioId()).collection(RADIO_PROGRAM_TABLE).document(model.getProgramId());
//
//            fireStoreDelete(documentReference, new CallBack() {
//                @Override
//                public void onSuccess(Object object) {
//                    callBack.onSuccess(AppGeneralMessage.SUCCESS);
//                }
//
//                @Override
//                public void onFailure(Object object) {
//                    callBack.onFailure(object);
//                }
//            });
//        } else {
//            callBack.onFailure(AppGeneralMessage.FAIL);
//        }
//    }
//
//
//
//
//    @Override
//    public void queryAllBy(String key, RadioProgram model, CallBack callBack) {
//
//        Query query = null;
//        if (model != null){
//            RadioProgram radioProgram = (RadioProgram) model;
//            query = colRef.document(radioProgram.getRadioId()).collection(RADIO_PROGRAM_TABLE).whereEqualTo("radioId", radioProgram.getRadioId()).whereEqualTo("programId", radioProgram.getProgramId());
//        }else if (!isNullOrEmpty(key) ){
//            query = colRef.document(key).collection(RADIO_PROGRAM_TABLE)/*.orderBy("dateTimeModel.dateEnd", Query.Direction.DESCENDING)*/.orderBy("rateCount", Query.Direction.DESCENDING);
//
//        }
//
//        if (query != null){
//            readQueryDocuments(query, new CallBack() {
//                @Override
//                public void onSuccess(Object object) {
//                    if (object != null) {
//                        callBack.onSuccess(getDataFromQuerySnapshot(object));
//                    } else
//                        callBack.onSuccess(null);
//                }
//
//                @Override
//                public void onFailure(Object object) {
//                    callBack.onFailure(object);
//                }
//            });
//        }else {
//            callBack.onFailure(AppGeneralMessage.FAIL);
//        }
//    }
//
//    @Override
//    public void queryAllByKeyValue(@NonNull String field, @Nullable Object value, RadioProgram model, CallBack callBack) {
//
//    }
//
//
//
///*
//    @Override
//    public void readProgramByRadioIdAndProgramId(RadioProgram program, CallBack callBack) {
//        if (!isEmptyOrNull(program.getProgramId())) {
//
//            // Todo fixme
////             Timestamp timestamp = new Timestamp(new Date());
//            Query query = colRef.document(program.getRadioId()).collection(RADIO_PROGRAM_TABLE).whereEqualTo("radioId", program.getRadioId()).whereEqualTo("programId", program.getProgramId());
//            readQueryDocuments(query, new CallBack() {
//                @Override
//                public void onSuccess(Object object) {
//                    if (object != null) {
//                        */
//    /*
//     *Here we episode data order by created  in ASCENDING ORDER
//     *//*
//
//                        callBack.onSuccess(getDataFromQuerySnapshot(object));
//                    } else
//                        callBack.onSuccess(null);
//                }
//
//                @Override
//                public void onError(Object object) {
//                    callBack.onError(object);
//                }
//            });
//        } else {
//            callBack.onError(FAIL);
//        }
//    }
//
//    @Override
//    public void delete(RadioProgram program, CallBack callBack) {
//        if (!isEmptyOrNull(program.getRadioId()) && !isEmptyOrNull(program.getProgramId())) {
//
//            DocumentReference documentReference = colRef.document(program.getRadioId()).collection(RADIO_PROGRAM_TABLE).document(program.getProgramId());
//
//            fireStoreDelete(documentReference, new CallBack() {
//                @Override
//                public void onSuccess(Object object) {
//                    mProgressHUD.dismiss();
//                    callBack.onSuccess(SUCCESS);
//                }
//
//                @Override
//                public void onError(Object object) {
//                    mProgressHUD.dismiss();
//                    callBack.onError(object);
//                }
//            });
//        } else {
//            callBack.onError(FAIL);
//        }
//    }
//*/
//
//
///*
//    @Override
//    public ListenerRegistration readAllEmployeesByDataChangeEvent(final CallBack callBack) {
//
//        //get all employees order by employee name
//        Query query = colRef.orderBy("empName");
//        return readQueryDocumentsByListener(query, new CallBack() {
//            @Override
//            public void onSuccess(Object object) {
//                if (object != null) {
//                    callBack.onSuccess(getDataFromQuerySnapshot(object));
//                } else
//                    callBack.onSuccess(null);
//                mProgressHUD.dismiss();
//            }
//
//            @Override
//            public void onError(Object object) {
//                mProgressHUD.dismiss();
//                callBack.onError(object);
//            }
//        });
//    }
//
//    @Override
//    public ListenerRegistration readAllEmployeesByChildEvent(final FirebaseChildCallBack firebaseChildCallBack) {
//
//        //get all employees order by created date time
//        Query query = colRef.orderBy("createdDateTime");
//        return readQueryDocumentsByChildEventListener(query, new FirebaseChildCallBack() {
//            @Override
//            public void onChildAdded(Object object) {
//                if (object != null) {
//                    DocumentSnapshot document = (DocumentSnapshot) object;
//                    if (document.exists()) {
//                        RadioProgram employee = document.toObject(RadioProgram.class);
//                        firebaseChildCallBack.onChildAdded(employee);
//                    } else {
//                        firebaseChildCallBack.onChildAdded(null);
//                    }
//                } else {
//                    firebaseChildCallBack.onChildAdded(null);
//                }
//                mProgressHUD.dismiss();
//            }
//
//            @Override
//            public void onChildChanged(Object object) {
//                if (object != null) {
//                    DocumentSnapshot document = (DocumentSnapshot) object;
//                    if (document.exists()) {
//                        RadioProgram employee = document.toObject(RadioProgram.class);
//                        firebaseChildCallBack.onChildChanged(employee);
//                    } else {
//                        firebaseChildCallBack.onChildChanged(null);
//                    }
//                } else {
//                    firebaseChildCallBack.onChildChanged(null);
//                }
//            }
//
//            @Override
//            public void onChildRemoved(Object object) {
//                if (object != null) {
//                    DocumentSnapshot document = (DocumentSnapshot) object;
//                    if (document.exists()) {
//                        RadioProgram employee = document.toObject(RadioProgram.class);
//                        firebaseChildCallBack.onChildRemoved(employee);
//                    } else {
//                        firebaseChildCallBack.onChildRemoved(null);
//                    }
//                } else {
//                    firebaseChildCallBack.onChildRemoved(null);
//                }
//            }
//
//            @Override
//            public void onCancelled(Object object) {
//                firebaseChildCallBack.onCancelled(object);
//                mProgressHUD.dismiss();
//            }
//        });
//    }
//*/
//
//
//    public List<RadioProgram> getDataFromQuerySnapshot(Object object) {
//        List<RadioProgram> programList = new ArrayList<>();
//        try {
//            QuerySnapshot queryDocumentSnapshots = (QuerySnapshot) object;
//            for (DocumentSnapshot snapshot : queryDocumentSnapshots) {
//                RadioProgram program = snapshot.toObject(RadioProgram.class);
//                if (!program.isDisabled())
//                    programList.add(program);
//            }
//        } catch (Exception e) {
//            LogUtility.e(TAG, " getDataFromQuerySnapshot: " + object, e);
//        }
//        return programList;
//    }
//
//
//}