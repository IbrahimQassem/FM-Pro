package com.sana.dev.fm.utils.my_firebase;

import static com.sana.dev.fm.utils.FmUtilize.pojo2Map;

import android.app.Activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QueryDocumentSnapshot;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.utils.LogUtility;

import java.util.ArrayList;
import java.util.List;


public class FmUserCRUDImpl extends FirebaseRepository implements FmCRUD {
    public static final String TAG = FmUserCRUDImpl.class.getSimpleName();

    private Activity activity;
    private CollectionReference colRef;

    public FmUserCRUDImpl(Activity activity, String TableName) {
        this.activity = activity;
        colRef = FirebaseDatabaseReference.getTopLevelCollection().getFirestore().collection(TableName);
    }


    @Override
    public void create(String key, Object model, CallBack callBack) {
        if (key != null && model != null) {
            UserModel userModel = (UserModel) model;
//            ProgressHUD mProgressHUD = ProgressHUD.show(activity, getString(R.string.please_wait), true, false, null);
            DocumentReference documentReference = colRef.document(key);

            fireStoreCreateOrMerge(documentReference, pojo2Map(userModel), new CallBack() {
                @Override
                public void onSuccess(Object object) {
//                    mProgressHUD.dismiss();
//                    prefMgr.write(FirebaseConstants.USER_INFO, _userModel);
                    callBack.onSuccess(userModel);
                }

                @Override
                public void onFailure(Object object) {
//                    mProgressHUD.dismiss();
                    callBack.onFailure(AppGeneralMessage.ERROR);
                }
            });
        } else {
            callBack.onFailure(AppGeneralMessage.FAIL);
        }
    }

    @Override
    public void update(String key, Object model, CallBack callBack) {

    }

    @Override
    public void delete(Object data, CallBack callBack) {
        if (data != null) {
            UserModel model = (UserModel) data;
            DocumentReference documentReference = colRef.document(model.getUserId());
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


    @Override
    public void queryAllBy(String key, Object model, CallBack callBack) {
        if (key != null) {
            Query query = colRef.whereEqualTo("mobile", key);
            query.get()
                    .addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
                        @Override
                        public void onComplete(@NonNull Task<QuerySnapshot> task) {
                            if (task.isSuccessful()) {
                                UserModel user = new UserModel();
                                LogUtility.d(TAG, "queryAllBy : " + user.toString());

                                for (QueryDocumentSnapshot document : task.getResult()) {
//                                    Log.d("TAG", document.getId() + " => " + document.getData());
                                    user = document.toObject(UserModel.class);
                                    break;
                                }
                                if (user.getUserId() != null) {
                                    user.setVerified(true);
                                    callBack.onSuccess(user);

                                } else {
                                    callBack.onFailure(null);
                                }

                            } else {
                                LogUtility.e(TAG, "queryAllBy : " + task.getException());
                                callBack.onFailure(task.getException());
                            }
                        }
                    });
        } else {
            callBack.onFailure(AppGeneralMessage.FAIL);
        }
    }

    @Override
    public void queryAllByKeyValue(@NonNull String field, @Nullable Object value, Object model, CallBack callBack) {

    }

    public void queryAllByFbEmail(String key, Object model, CallBack callBack) {
        if (key != null) {
            Query query = colRef.whereEqualTo("email", key);
            query.get()
                    .addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
                        @Override
                        public void onComplete(@NonNull Task<QuerySnapshot> task) {
                            if (task.isSuccessful()) {
                                UserModel user = new UserModel();
                                LogUtility.d(TAG, "queryAllBy : " + user.toString());

                                for (QueryDocumentSnapshot document : task.getResult()) {
//                                    Log.d("TAG", document.getId() + " => " + document.getData());
                                    user = document.toObject(UserModel.class);
                                    break;
                                }
                                if (user.getUserId() != null) {
                                    user.setVerified(true);
                                    callBack.onSuccess(user);

                                } else {
                                    callBack.onFailure(null);
                                }

                            } else {
                                LogUtility.e(TAG, "queryAllBy : " + task.getException());
                                callBack.onFailure(task.getException());
                            }
                        }
                    });
        } else {
            callBack.onFailure(AppGeneralMessage.FAIL);
        }
    }




/*
    @Override
    public void getOneUser(String userId, CallBack callBack) {
        if (!isEmptyOrNull(userId)) {
            DocumentReference docRef = colRef.document(userId);
            readDocument(docRef, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    if (object != null) {
                        */
    /*
     *Here we episode data order by created tade in ASCENDING ORDER
     *//*

//                        callBack.onSuccess(getDataFromQuerySnapshot(object));
                        callBack.onSuccess(object);
                    } else
                        callBack.onSuccess(null);
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

    public List<UserModel> getDataFromQuerySnapshot(Object object) {
        List<UserModel> programList = new ArrayList<>();
        try {
            QuerySnapshot queryDocumentSnapshots = (QuerySnapshot) object;
            for (DocumentSnapshot snapshot : queryDocumentSnapshots) {
                UserModel program = snapshot.toObject(UserModel.class);
                programList.add(program);
            }
        } catch (Exception e) {
            LogUtility.e(TAG, " getDataFromQuerySnapshot: " + object, e);
        }
        return programList;
    }


}