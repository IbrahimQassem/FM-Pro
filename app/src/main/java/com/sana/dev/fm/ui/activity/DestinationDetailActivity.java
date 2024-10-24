package com.sana.dev.fm.ui.activity;

import android.os.Bundle;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.TagsAdapter;
import com.sana.dev.fm.model.DestinationModel;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;

import java.util.Locale;

public class DestinationDetailActivity extends AppCompatActivity {
    private static final String TAG = "DestinationDetail";

    private ImageView headerImage;
    private TextView titleText;
    private TextView locationText;
    private TextView ratingText;
    private TextView durationText;
    private TextView descriptionText;
    private TextView priceText;
    private RecyclerView tagsRecyclerView;
    private Button bookNowButton;
    private ImageButton favoriteButton;
    private ProgressBar progressBar;

    private String destinationId;
    private DestinationModel currentDestination;
    private boolean isFavorite = false;
    private FirestoreDbUtility firestoreDbUtility ;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_destination_detail);

        firestoreDbUtility = new FirestoreDbUtility();

        destinationId = getIntent().getStringExtra("destination_id");
        if (destinationId == null) {
            Toast.makeText(this, "Error loading destination", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        initializeViews();
        setupToolbar();
        loadDestinationDetails();
        checkFavoriteStatus();
    }

    private void initializeViews() {
        headerImage = findViewById(R.id.destinationImage);
        titleText = findViewById(R.id.destinationTitle);
        locationText = findViewById(R.id.locationText);
        ratingText = findViewById(R.id.ratingText);
        durationText = findViewById(R.id.durationText);
        descriptionText = findViewById(R.id.descriptionText);
        priceText = findViewById(R.id.priceText);
        tagsRecyclerView = findViewById(R.id.tagsRecyclerView);
        bookNowButton = findViewById(R.id.bookNowButton);
        favoriteButton = findViewById(R.id.favoriteButton);
        progressBar = findViewById(R.id.progressBar);

        // Setup RecyclerView for tags
        tagsRecyclerView.setLayoutManager(
                new LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false));

        // Setup click listeners
        bookNowButton.setOnClickListener(v -> handleBooking());
        favoriteButton.setOnClickListener(v -> toggleFavorite());
    }

    private void setupToolbar() {
        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowTitleEnabled(false);
        }
    }

    private void loadDestinationDetails() {
        progressBar.setVisibility(View.VISIBLE);

        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.ADVERTISEMENT_TABLE).collection(AppConstant.Firebase.ADVERTISEMENT_TABLE);  // Subcollection named "1001"

        collectionReference
                .document(destinationId)
                .get()
                .addOnSuccessListener(documentSnapshot -> {
                    progressBar.setVisibility(View.GONE);
                    currentDestination = documentSnapshot.toObject(DestinationModel.class);
                    if (currentDestination != null) {
                        updateUI(currentDestination);
                    }
                })
                .addOnFailureListener(e -> {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(this, "Error loading destination details",
                            Toast.LENGTH_SHORT).show();
                    LogUtility.e(TAG, "Error loading destination", e);
                });
    }

    private void updateUI(DestinationModel destination) {
        // Load header image
        Glide.with(this)
                .load(destination.getImageUrl())
                .transition(DrawableTransitionOptions.withCrossFade())
                .into(headerImage);

        titleText.setText(destination.getName());
        locationText.setText(destination.getLocation());
        ratingText.setText(String.format(Locale.getDefault(), "%.1f", destination.getRating()));
        durationText.setText(String.format(Locale.getDefault(), "%d Days", destination.getDuration()));
        descriptionText.setText(destination.getDescription());
        priceText.setText(String.format(Locale.getDefault(), "$%.2f", destination.getPrice()));

        // Setup tags
        TagsAdapter tagsAdapter = new TagsAdapter(destination.getTags());
        tagsRecyclerView.setAdapter(tagsAdapter);
    }

    private void checkFavoriteStatus() {
        String userId = FirebaseAuth.getInstance().getCurrentUser().getUid();
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.USERS_TABLE).collection(AppConstant.Firebase.USERS_TABLE);
        collectionReference
                .document(userId)
                .collection("favorites")
                .document(destinationId)
                .get()
                .addOnSuccessListener(documentSnapshot -> {
                    isFavorite = documentSnapshot.exists();
                    updateFavoriteButton();
                });
    }

    private void toggleFavorite() {
        String userId = FirebaseAuth.getInstance().getCurrentUser().getUid();
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.USERS_TABLE).collection(AppConstant.Firebase.USERS_TABLE);
        DocumentReference favoriteRef = collectionReference
                .document(userId)
                .collection("favorites")
                .document(destinationId);

        if (isFavorite) {
            favoriteRef.delete()
                    .addOnSuccessListener(aVoid -> {
                        isFavorite = false;
                        updateFavoriteButton();
                    });
        } else {
            favoriteRef.set(currentDestination)
                    .addOnSuccessListener(aVoid -> {
                        isFavorite = true;
                        updateFavoriteButton();
                    });
        }
    }

    private void updateFavoriteButton() {
        favoriteButton.setImageResource(isFavorite ?
                R.drawable.ic_info : R.drawable.ic_favorites);
    }

    private void handleBooking() {
        // Implement booking logic
//        Intent intent = new Intent(this, BookingActivity.class);
//        intent.putExtra("destination", currentDestination);
//        startActivity(intent);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            onBackPressed();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}