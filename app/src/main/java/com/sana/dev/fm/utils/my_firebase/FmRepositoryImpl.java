package com.sana.dev.fm.utils.my_firebase;

import static com.sana.dev.fm.utils.FmUtilize.isEmptyOrNull;
import static com.sana.dev.fm.utils.my_firebase.AppConstant.FAIL;
import static com.sana.dev.fm.utils.my_firebase.AppConstant.SUCCESS;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.RADIO_PROGRAM_TABLE;
import static com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference.DATABASE;

import android.app.Activity;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.ListenerRegistration;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QuerySnapshot;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.utils.ProgressHUD;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class FmRepositoryImpl extends FirebaseRepository implements EmployeeRepository, SharedAction {
    private Activity activity;
    private CollectionReference colRef;

    public FmRepositoryImpl(Activity activity, String TableName) {
        this.activity = activity;
        colRef = DATABASE.collection(TableName);
    }


    @Override
    public void createEmployee(RadioProgram employee, final CallBack callBack) {
        String pushKey = colRef.document().getId();
        if (employee != null && !isEmptyOrNull(pushKey)) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);


            employee.setProgramId(pushKey);
            DocumentReference documentReference = colRef.document(pushKey);
            fireStoreCreate(documentReference, employee, new CallBack() {
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

    @Override
    public void create(String rdid, Object o, CallBack callBack) {
        String pushKey = colRef.document().getId();
        if (o != null && !isEmptyOrNull(pushKey)) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

//            employee.setpId(pushKey);
//            DocumentReference documentReference = employeeCollectionReference.document(pushKey);

            final Map<String, Object> map;

            Gson gson = new Gson(); // Or use new GsonBuilder().create();
            RadioProgram target = new RadioProgram();
            String json = gson.toJson(target); // serializes target to Json
            RadioProgram target2 = gson.fromJson(json, RadioProgram.class); // deserializes json into target2

            DocumentReference documentReference = colRef.document(rdid)
                    .collection("All programs").document(pushKey);

            fireStoreCreate(documentReference, o, new CallBack() {
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

    @Override
    public void updateArray(String pushKey, Map<String, Object> map, final CallBack callBack) {

        if (!isEmptyOrNull(pushKey)) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

            DocumentReference documentReference = colRef.document(pushKey);
            arrayUpdate(documentReference, pushKey, map, new CallBack() {
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


    @Override
    public void updateEmployee(String pushKey, HashMap map, final CallBack callBack) {
        if (!isEmptyOrNull(pushKey)) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

            DocumentReference documentReference = colRef.document(pushKey);
            fireStoreUpdate(documentReference, map, new CallBack() {
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

    @Override
    public void deleteEmployee(String employeeKey, final CallBack callBack) {
        if (!isEmptyOrNull(employeeKey)) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

            DocumentReference documentReference = colRef.document(employeeKey);
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

    @Override
    public void readWhere(String employeeKey, final CallBack callBack) {
        if (!isEmptyOrNull(employeeKey)) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

            DocumentReference documentReference = colRef.document(employeeKey);
            readDocument(documentReference, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    callBack.onSuccess(object);
                    mProgressHUD.dismiss();
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

    @Override
    public void readAllProgramByRadioId(String rdId, final CallBack callBack) {
        if (!isEmptyOrNull(rdId)) {
//                ProgressHUD mProgressHUD  = ProgressHUD.show(activity, getString(R.string.please_wait), true, false, null);

//            Query query = colRef
//                    .document(rdId)
//                    .collection(RADIO_PROGRAM_TABLE);

//            Query query = colRef.document(rdId).collection(RADIO_PROGRAM_TABLE).whereNotEqualTo("stopped", true).orderBy("stopped", Query.Direction.DESCENDING).orderBy("rateCount", Query.Direction.DESCENDING);
            Query query = colRef.document(rdId).collection(RADIO_PROGRAM_TABLE)/*.orderBy("dateTimeModel.dateEnd", Query.Direction.DESCENDING)*/.orderBy("rateCount", Query.Direction.DESCENDING);

//            Query query = employeeCollectionReference;
//                    .whereEqualTo("branchDetails.designation", rdId);
//                    .whereEqualTo("branch", branch);
//                    .orderBy("empName", ASCENDING);
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
    public void updatePG(String riId, String rpId, HashMap map, CallBack callBack) {
        if (!isEmptyOrNull(riId) && !isEmptyOrNull(rpId)) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

            DocumentReference documentReference = colRef.document(riId).collection(RADIO_PROGRAM_TABLE).document(rpId);

            fireStoreUpdate(documentReference, map, new CallBack() {
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


    @Override
    public void readProgramByRadioIdAndProgramId(RadioProgram program, CallBack callBack) {
        if (!isEmptyOrNull(program.getProgramId())) {

            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

//             Timestamp timestamp = new Timestamp(new Date());
            Query query = colRef.document(program.getRadioId()).collection(RADIO_PROGRAM_TABLE).whereEqualTo("radioId", program.getRadioId()).whereEqualTo("programId", program.getProgramId());
            readQueryDocuments(query, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    if (object != null) {
                        /*
                         *Here we episode data order by created tade in ASCENDING ORDER
                         */
                        callBack.onSuccess(getDataFromQuerySnapshot(object));
                    } else
                        callBack.onSuccess(null);
                    mProgressHUD.dismiss();
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

    @Override
    public void deleteProgram(RadioProgram program, CallBack callBack) {
        if (!isEmptyOrNull(program.getRadioId()) && !isEmptyOrNull(program.getProgramId())) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

            DocumentReference documentReference = colRef.document(program.getRadioId()).collection(RADIO_PROGRAM_TABLE).document(program.getProgramId());

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


    @Override
    public ListenerRegistration readAllEmployeesByDataChangeEvent(final CallBack callBack) {
        ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

        //get all employees order by employee name
        Query query = colRef.orderBy("empName");
        return readQueryDocumentsByListener(query, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                if (object != null) {
                    callBack.onSuccess(getDataFromQuerySnapshot(object));
                } else
                    callBack.onSuccess(null);
                mProgressHUD.dismiss();
            }

            @Override
            public void onError(Object object) {
                mProgressHUD.dismiss();
                callBack.onError(object);
            }
        });
    }

    @Override
    public ListenerRegistration readAllEmployeesByChildEvent(final FirebaseChildCallBack firebaseChildCallBack) {
        ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

        //get all employees order by created date time
        Query query = colRef.orderBy("createdDateTime");
        return readQueryDocumentsByChildEventListener(query, new FirebaseChildCallBack() {
            @Override
            public void onChildAdded(Object object) {
                if (object != null) {
                    DocumentSnapshot document = (DocumentSnapshot) object;
                    if (document.exists()) {
                        RadioProgram employee = document.toObject(RadioProgram.class);
                        firebaseChildCallBack.onChildAdded(employee);
                    } else {
                        firebaseChildCallBack.onChildAdded(null);
                    }
                } else {
                    firebaseChildCallBack.onChildAdded(null);
                }
                mProgressHUD.dismiss();
            }

            @Override
            public void onChildChanged(Object object) {
                if (object != null) {
                    DocumentSnapshot document = (DocumentSnapshot) object;
                    if (document.exists()) {
                        RadioProgram employee = document.toObject(RadioProgram.class);
                        firebaseChildCallBack.onChildChanged(employee);
                    } else {
                        firebaseChildCallBack.onChildChanged(null);
                    }
                } else {
                    firebaseChildCallBack.onChildChanged(null);
                }
            }

            @Override
            public void onChildRemoved(Object object) {
                if (object != null) {
                    DocumentSnapshot document = (DocumentSnapshot) object;
                    if (document.exists()) {
                        RadioProgram employee = document.toObject(RadioProgram.class);
                        firebaseChildCallBack.onChildRemoved(employee);
                    } else {
                        firebaseChildCallBack.onChildRemoved(null);
                    }
                } else {
                    firebaseChildCallBack.onChildRemoved(null);
                }
            }

            @Override
            public void onCancelled(Object object) {
                firebaseChildCallBack.onCancelled(object);
                mProgressHUD.dismiss();
            }
        });
    }

    @Override
    public void readEmployeesSalaryGraterThanLimit(long limit, final CallBack callBack) {
        ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

        //get all employees order by employee name
        Query query = colRef.whereGreaterThan("salary", limit).orderBy("salary");
        readQueryDocuments(query, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                if (object != null) {
                    callBack.onSuccess(getDataFromQuerySnapshot(object));
                } else
                    callBack.onSuccess(null);
                mProgressHUD.dismiss();
            }

            @Override
            public void onError(Object object) {
                mProgressHUD.dismiss();
                callBack.onError(object);
            }
        });
    }

    @Override
    public void createPG(String rdId, RadioProgram program, CallBack callBack) {
        String pushKey = colRef.document().getId();
        if (program != null && !isEmptyOrNull(pushKey)) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( getString(R.string.please_wait), true, false, null);

//            employee.setpId(pushKey);
            program.setRadioId(rdId);
            program.setProgramId(pushKey);
//            DocumentReference documentReference = employeeCollectionReference.document(pushKey);


//            Gson gson = new Gson(); // Or use new GsonBuilder().create();
//            RadioProgram target = new RadioProgram();
//            String json = gson.toJson(target); // serializes target to Json
//            RadioProgram target2 = gson.fromJson(json, RadioProgram.class); // deserializes json into target2

            DocumentReference documentReference = colRef.document(rdId).collection(RADIO_PROGRAM_TABLE).document(pushKey);

            fireStoreCreate(documentReference, program, new CallBack() {
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

    public List<RadioProgram> getDataFromQuerySnapshot(Object object) {
        List<RadioProgram> programList = new ArrayList<>();
        QuerySnapshot queryDocumentSnapshots = (QuerySnapshot) object;
        for (DocumentSnapshot snapshot : queryDocumentSnapshots) {
            RadioProgram program = snapshot.toObject(RadioProgram.class);
            if (!program.isStopped())
            programList.add(program);
        }
        return programList;
    }


}