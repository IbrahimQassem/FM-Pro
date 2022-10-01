package com.sana.dev.fm.adapter;


import static com.sana.dev.fm.utils.FmUtilize.timeDifference;
import static com.sana.dev.fm.utils.Tools.getFormattedTimeEvent;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.github.vipulasri.timelineview.TimelineView;
import com.mikhaellopez.circularimageview.CircularImageView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.model.TempEpisodeModel;

import java.util.List;


public class TimeLineAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private final int avatarSize;
    private List<TempEpisodeModel> timeLineModelList;
    private Context context;

    public TimeLineAdapter(Context context, List<TempEpisodeModel> timeLineModelList) {
        this.timeLineModelList = timeLineModelList;
        this.context = context;
        avatarSize = context.getResources().getDimensionPixelSize(R.dimen.comment_avatar_size);

    }

    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_timeline, parent, false);
        return new ViewHolder(view, viewType);
    }

    @Override
    public void onBindViewHolder(RecyclerView.ViewHolder holder, int position) {

        if (holder instanceof ViewHolder) {
            ViewHolder viewHolder = (ViewHolder) holder;


            TempEpisodeModel episode = timeLineModelList.get(position);
//            boolean isToday = episode.getDateTimeModel().contains(episode.getDateTimeModel().getDisplayDays(), getShortEnDayName());
//            boolean isToday = true;// episode.getDisplayDayName().matches(getShortEnDayName());


//            if (!isToday) {
//                holder.itemView.setVisibility(View.GONE);
//                holder.itemView.setLayoutParams(new RecyclerView.LayoutParams(0, 0));

//            } else {
                holder.itemView.setVisibility(View.VISIBLE);
                holder.itemView.setLayoutParams(new RecyclerView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

                viewHolder.tvTitle.setText(episode.getEpName());
                viewHolder.tvSubTitle.setText(episode.getEpAnnouncer());
                // TODO: I am waiting for you to be fixed ;)
//            List<DateTimeModel> _showTimeList = episode.getShowTimeList();
//            for (DateTimeModel a : _showTimeList) {
//                // or equalsIgnoreCase or whatever your conditon is
//                if (a.isItMainTime()) {
//                // do something
//            viewHolder.tevDate.setText(getFormattedDateEvent(new Date()));
//                   viewHolder.tevDate.setText(getFormattedTimeEvent(episode.showTimeObj.getTimeStart()));
//                }
//            }


                Tools.displayImageRound(context, viewHolder.circularImage, episode.getEpProfile());


//        if (timeLineModelList.get(position).getStatus().equals("inactive"))
//            if ( position != 1)
                // TODO: I am waiting for you to be fixed ;)
//            if (!episode.getDateTimeModel().contains(episode.getDateTimeModel().getDisplayDays(),getShortEnDayName()))
//            List<DateTimeModel> _showTimeList = episode.getShowTimeList();

//            DateTimeModel timeModel = episode.showTimeObj;
//            for (int i = 0; i < _showTimeList.size(); i++) {
                String st = "يبدأ الساعة : " + getFormattedTimeEvent(episode.getDateTimeModel().getTimeStart());
                viewHolder.tevDate.setText(st);
//            String ts = "Start : " + getFormattedTimeEvent(timeModel.getTimeStart()) + "End : " + getFormattedTimeEvent(timeModel.getTimeEnd());
                String period = "مدة العرض : " + timeDifference(episode.getDateTimeModel().getTimeStart(), episode.getDateTimeModel().getTimeEnd());
                viewHolder.tevTimeShow.setText(period);

                String replay = episode.getDateTimeModel().isItMainTime() ? "" : "إعادة";
                int _state = episode.getDateTimeModel().isItMainTime() ? View.INVISIBLE : View.VISIBLE;
                viewHolder.tevEpState.setVisibility(_state);
                viewHolder.tevEpState.setText(replay);


                boolean isNow = episode.getDateTimeModel().isWithinRange(episode.getDateTimeModel());
                if (!isNow)
                    viewHolder.timelineView.setMarker(ContextCompat.getDrawable(context, R.drawable.ic_baseline_adjust_24));
                else
                    viewHolder.timelineView.setMarker(ContextCompat.getDrawable(context, R.drawable.ic_baseline_check_circle_24));
//            }

//            // last item
//            if(position==(getItemCount()-1)){
//                viewHolder.timelineView.setEndLineColor(ContextCompat.getColor(context, R.color.transparent),getItemViewType(position));
//            }

//            }
        }


    }


//    private void setMarker(holder: TimeLineViewHolder, drawableResId: Int, colorFilter: Int) {
//        holder.timeline.marker = VectorDrawableUtils.getDrawable(holder.itemView.context, drawableResId, ContextCompat.getColor(holder.itemView.context, colorFilter))
//    }

    @Override
    public int getItemViewType(int position) {
        return TimelineView.getTimeLineViewType(position, getItemCount());
    }

    @Override
    public int getItemCount() {
        return timeLineModelList.size();
    }

    public void newAddeddata(TempEpisodeModel episode) {
        timeLineModelList.add(episode);
        notifyDataSetChanged();
    }

    private class ViewHolder extends RecyclerView.ViewHolder {

        TimelineView timelineView;
        CircularImageView circularImage;
        TextView tvTitle, tvSubTitle, tevDate, tevTimeShow, tevEpState;

        ViewHolder(View itemView, int viewType) {
            super(itemView);
            timelineView = itemView.findViewById(R.id.timeline);
            circularImage = itemView.findViewById(R.id.circularImage);
            tvTitle = itemView.findViewById(R.id.tvTitle);
            tvSubTitle = itemView.findViewById(R.id.tvSubTitle);
            tevDate = itemView.findViewById(R.id.tevDate);
            tevTimeShow = itemView.findViewById(R.id.tevTimeShow);
            tevEpState = itemView.findViewById(R.id.tevEpState);

            timelineView.initLine(viewType);
        }
    }
}


