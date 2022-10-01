package com.sana.dev.fm.utils.my_firebase;//package com.sana.dev.fm.sheard.my_firabse;
//
//public class FirebaseMultiQuery {
//
//    private final HashSet<DatabaseReference> refs = new HashSet<>();
//    private final HashMap<DatabaseReference, DataSnapshot> snaps = new HashMap<>();
//    private final HashMap<DatabaseReference, ValueEventListener> listeners = new HashMap<>();
//
//    public FirebaseMultiQuery(final DatabaseReference... refs) {
//        for (final DatabaseReference ref : refs) {
//            add(ref);
//        }
//    }
//
//    public void add(final DatabaseReference ref) {
//        refs.add(ref);
//    }
//
//    public Task<Map<DatabaseReference, DataSnapshot>> start() {
//        // Create a Task<DataSnapsot> to trigger in response to each database listener.
//        //
//        final ArrayList<Task<DataSnapshot>> tasks = new ArrayList<>(refs.size());
//        for (final DatabaseReference ref : refs) {
//            final TaskCompletionSource<DataSnapshot> source = new TaskCompletionSource<>();
//            final ValueEventListener listener = new MyValueEventListener(ref, source);
//            ref.addListenerForSingleValueEvent(listener);
//            listeners.put(ref, listener);
//            tasks.add(source.getTask());
//        }
//
//        // Return a single Task that triggers when all queries are complete.  It contains
//        // a map of all original DatabaseReferences originally given here to their resulting
//        // DataSnapshot.
//        //
//        return Tasks.whenAll(tasks).continueWith(new Continuation<Void, Map<DatabaseReference, DataSnapshot>>() {
//            @Override
//            public Map<DatabaseReference, DataSnapshot> then(@NonNull Task<Void> task) throws Exception {
//                task.getResult();
//                return new HashMap<>(snaps);
//            }
//        });
//    }
//
//    public void stop() {
//        for (final Map.Entry<DatabaseReference, ValueEventListener> entry : listeners.entrySet()) {
//            entry.getKey().removeEventListener(entry.getValue());
//        }
//        snaps.clear();
//        listeners.clear();
//    }
//
//    private class MyValueEventListener implements ValueEventListener {
//        private final DatabaseReference ref;
//        private final TaskCompletionSource<DataSnapshot> taskSource;
//
//        public MyValueEventListener(DatabaseReference ref, TaskCompletionSource<DataSnapshot> taskSource) {
//            this.ref = ref;
//            this.taskSource = taskSource;
//        }
//
//        @Override
//        public void onDataChange(DataSnapshot dataSnapshot) {
//            snaps.put(ref, dataSnapshot);
//            taskSource.setResult(dataSnapshot);
//        }
//
//        @Override
//        public void onCancelled(DatabaseError databaseError) {
//            taskSource.setException(databaseError.toException());
//        }
//    }
//
//}
//firebaseMultiQuery = new FirebaseMultiQuery(dbRef1, dbRef2, dbRef3, ...);
//final Task<Map<DatabaseReference, DataSnapshot>> allLoad = firebaseMultiQuery.start();
//        allLoad.addOnCompleteListener(activity, new AllOnCompleteListener());

//private class AllOnCompleteListener implements OnCompleteListener<Map<DatabaseReference, DataSnapshot>> {
//    @Override
//    public void onComplete(@NonNull Task<Map<DatabaseReference, DataSnapshot>> task) {
//        if (task.isSuccessful()) {
//            final Map<DatabaseReference, DataSnapshot> result = task.getResult();
//            // Look up DataSnapshot objects using the same DatabaseReferences you passed into FirebaseMultiQuery
//        }
//        else {
//            exception = task.getException();
//            // log the error or whatever you need to do
//        }
//        // Do stuff with views
//        updateUi();
//    }
//}

//Only load layout when firebase calls are complete