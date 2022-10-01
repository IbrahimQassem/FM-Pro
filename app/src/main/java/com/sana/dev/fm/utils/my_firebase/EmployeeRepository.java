package com.sana.dev.fm.utils.my_firebase;

import com.google.firebase.firestore.ListenerRegistration;
import com.sana.dev.fm.model.RadioProgram;

import java.util.HashMap;
import java.util.Map;

public interface EmployeeRepository {
    void create(String pushKey , Object o, CallBack callBack);
    void readWhere(String sKey, CallBack callBack);




    void createEmployee(RadioProgram employee, CallBack callBack);
    void updateEmployee(String employeeKey, HashMap map, CallBack callBack);
    void updateArray(String employeeKey, Map<String, Object> map, CallBack callBack);
    void deleteEmployee(String employeeKey, CallBack callBack);
    ListenerRegistration readAllEmployeesByDataChangeEvent(CallBack callBack);
    ListenerRegistration readAllEmployeesByChildEvent(FirebaseChildCallBack firebaseChildCallBack);
    void readEmployeesSalaryGraterThanLimit(long limit, CallBack callBack);


    void createPG(String rdId,RadioProgram program, CallBack callBack);
    void readAllProgramByRadioId( String rdId, CallBack callBack);
    void updatePG(String riId,String rpId, HashMap map, CallBack callBack);

    void readProgramByRadioIdAndProgramId(  RadioProgram program, CallBack callBack);
    void deleteProgram(RadioProgram program, CallBack callBack);

//    ListenerRegistration readAllPgByChildEvent(FirebaseChildCallBack firebaseChildCallBack);



}