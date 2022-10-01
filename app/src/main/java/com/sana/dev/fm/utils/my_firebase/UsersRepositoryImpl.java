package com.sana.dev.fm.utils.my_firebase;

import static com.sana.dev.fm.utils.FmUtilize.isEmptyOrNull;
import static com.sana.dev.fm.utils.FmUtilize.pojo2Map;
import static com.sana.dev.fm.utils.my_firebase.AppConstant.FAIL;
import static com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference.DATABASE;

import android.app.Activity;
import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QueryDocumentSnapshot;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.model.Users;

import java.util.ArrayList;
import java.util.List;


interface UsersRepository {
    void createUpdateUser(String userId,Users users, CallBack callBack);

    void isUserExists(String mobile, CallBack callBack);

    void getOneUser(String userId, CallBack callBack);

}

public class UsersRepositoryImpl extends FirebaseRepository implements UsersRepository {

    private Activity activity;
    private CollectionReference colRef;

    public UsersRepositoryImpl(Activity activity, String TableName) {
        this.activity = activity;
        colRef = DATABASE.collection(TableName);
    }


    private String getString(int id) {
        return activity.getString(id);
    }

    public List<Users> getDataFromQuerySnapshot(Object object) {
        List<Users> programList = new ArrayList<>();
        QuerySnapshot queryDocumentSnapshots = (QuerySnapshot) object;
        for (DocumentSnapshot snapshot : queryDocumentSnapshots) {
            Users program = snapshot.toObject(Users.class);
            programList.add(program);
        }
        return programList;
    }

    @Override
    public void createUpdateUser(String userId,Users users, CallBack callBack) {
        if (userId != null && users != null) {
//            ProgressHUD mProgressHUD = ProgressHUD.show(activity, getString(R.string.please_wait), true, false, null);
            DocumentReference documentReference = colRef.document(userId);

            fireStoreCreateOrMerge(documentReference, pojo2Map(users), new CallBack() {
                @Override
                public void onSuccess(Object object) {
//                    mProgressHUD.dismiss();
//                    prefMgr.write(FMCConstants.USER_INFO, _userModel);
                    callBack.onSuccess(users);
                }

                @Override
                public void onError(Object object) {
//                    mProgressHUD.dismiss();
                    callBack.onError(AppConstant.ERROR);
                }
            });
        } else {
            callBack.onError(FAIL);
        }
    }


    @Override
    public void isUserExists(String mobile, CallBack callBack) {
        if (mobile != null) {
            Query query = colRef.whereEqualTo("mobile", mobile);
            query.get()
                    .addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
                        @Override
                        public void onComplete(@NonNull Task<QuerySnapshot> task) {
                            if (task.isSuccessful()) {
                                Users user = new Users();
                                for (QueryDocumentSnapshot document : task.getResult()) {
//                                    Log.d("TAG", document.getId() + " => " + document.getData());
                                    user = document.toObject(Users.class);
                                    break;
                                }
                                if (user.getUserId() != null) {
                                    user.setVerified(true);
                                    callBack.onSuccess(user);

                                }else {
                                    callBack.onError(null);
                                }

                            } else {
                                Log.d("TAG", "Error getting documents: ", task.getException());
                                callBack.onError(task.getException());
                            }
                        }
                    });
        } else {
            callBack.onError(FAIL);
        }
    }

    @Override
    public void getOneUser(String userId, CallBack callBack) {
        if (!isEmptyOrNull(userId)) {
            DocumentReference docRef = colRef.document(userId);
            readDocument(docRef, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    if (object != null) {
                        /*
                         *Here we episode data order by created tade in ASCENDING ORDER
                         */
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


//        private boolean isPostValid(Map<String, Object> post) {
//        return post.containsKey("title")
//                && post.containsKey("description")
//                && post.containsKey("imageTitle")
//                && post.containsKey("authorId");
//    }

}