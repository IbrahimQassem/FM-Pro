package com.sana.dev.fm.adapter;


import static com.sana.dev.fm.utils.Tools.getFormattedTimeEvent;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.github.vipulasri.timelineview.TimelineView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemTimelineBinding;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.TempEpisodeModel;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.Tools;

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
        ItemTimelineBinding inflate = ItemTimelineBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
        return new MyViewHolder(inflate);
    }

    @Override
    public void onBindViewHolder(RecyclerView.ViewHolder viewHolder, int position) {

        if (viewHolder instanceof MyViewHolder) {
            MyViewHolder holder = (MyViewHolder) viewHolder;
            holder.setIsRecyclable(false);

            TempEpisodeModel episode = timeLineModelList.get(position);
            holder.itemView.setLayoutParams(new RecyclerView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

            holder.binding.tvTitle.setText(episode.getEpName());
            holder.binding.tvDesc.setText(episode.getEpAnnouncer());
            Tools.displayImageRound(context, holder.binding.civLogo, episode.getEpProfile());

            // Todo handel this
            if (episode.getShowTime() != null) {
                DateTimeModel showTime = episode.getShowTime();


                String st = context.getString(R.string.label_start_at_with_val, getFormattedTimeEvent(showTime.getTimeStart(), FmUtilize.arabicFormat));
                Tools.setTextOrHideIfEmpty(holder.binding.tvTime, st);

//                String period = context.getString(R.string.label_show_period, timeDifference(showTime.getTimeStart(), showTime.getTimeEnd(), FmUtilize.arabicFormat));
                String period = FmUtilize.calculateTimeDifference(context, showTime.getTimeStart(), showTime.getTimeEnd());
                Tools.setTextOrHideIfEmpty(holder.binding.tvDate, context.getString(R.string.label_show_period, period));

                String replay = showTime.isAsMainTime() ? context.getString(R.string.label_new_episode) : context.getString(R.string.label_replay);
//                int _state = showTime.isAsMainTime() ? View.INVISIBLE : View.VISIBLE;
                Tools.setTextOrHideIfEmpty(holder.binding.tvState, replay);

//                Weekday today = WeekdayUtils.getCurrentDayOfWeek();
//                boolean isDisplayDay = WeekdayUtils.isCurrentDay(episode.getDisplayDay());
//                holder.binding.tvDesc.setText(today.name());
                holder.binding.tvDesc.setText(episode.getDisplayDay().name());


                boolean isNow = showTime.isWithinRange(showTime);
                if (!isNow)
                    holder.binding.timeline.setMarker(ContextCompat.getDrawable(context, R.drawable.ic_baseline_adjust_24));
                else
                    holder.binding.timeline.setMarker(ContextCompat.getDrawable(context, R.drawable.ic_baseline_check_circle_24));

            }
        }

     /*   if (holder instanceof ViewHolder) {
            ViewHolder viewHolder = (ViewHolder) holder;
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


            // Todo handel this
            if (episode.getShowTime() != null) {
                DateTimeModel showTime =  episode.getShowTime();


                String st = context.getString(R.string.label_start_at_with_val, getFormattedTimeEvent(showTime.getTimeStart(), FmUtilize.arabicFormat));
                Tools.setTextOrHideIfEmpty(viewHolder.tevDate, st);

                String period = context.getString(R.string.label_show_period, timeDifference(showTime.getTimeStart(), showTime.getTimeEnd(), FmUtilize.arabicFormat));
                viewHolder.tevTimeShow.setText(period);

                String replay = showTime.isAsMainTime() ? "" : context.getString(R.string.label_replay);
                int _state = showTime.isAsMainTime() ? View.INVISIBLE : View.VISIBLE;
//                viewHolder.tevEpState.setVisibility(_state);
                viewHolder.tevEpState.setText(replay);

                Weekday today = WeekdayUtils.getCurrentDayOfWeek();
                boolean isMyDay = WeekdayUtils.isCurrentDay(showTime.getWeekdays().get(0));
                viewHolder.tevEpState.setText(replay);


                boolean isNow = showTime.isWithinRange(showTime);
                if (!isNow)
                    viewHolder.timelineView.setMarker(ContextCompat.getDrawable(context, R.drawable.ic_baseline_adjust_24));
                else
                    viewHolder.timelineView.setMarker(ContextCompat.getDrawable(context, R.drawable.ic_baseline_check_circle_24));

            }

//            if (episode.getProgramScheduleTime() != null) {
//                //        if (timeLineModelList.get(position).getStatus().equals("inactive"))
////            if ( position != 1)
//                // TODO: I am waiting for you to be fixed ;)
////            if (!episode.getDateTimeModel().contains(episode.getDateTimeModel().getDisplayDays(),getShortEnDayName()))
////            List<DateTimeModel> _showTimeList = episode.getShowTimeList();
//
////            DateTimeModel timeModel = episode.showTimeObj;
////            for (int i = 0; i < _showTimeList.size(); i++) {
//                String st = context.getString(R.string.label_start_at_with_val, getFormattedTimeEvent(episode.getProgramScheduleTime().getTimeStart(), FmUtilize.arabicFormat));
//                viewHolder.tevDate.setText(st);
////            String ts = "Start : " + getFormattedTimeEvent(timeModel.getTimeStart()) + "End : " + getFormattedTimeEvent(timeModel.getTimeEnd());
//                String period = context.getString(R.string.label_show_period, timeDifference(episode.getProgramScheduleTime().getTimeStart(), episode.getProgramScheduleTime().getTimeEnd(), FmUtilize.arabicFormat));
//                viewHolder.tevTimeShow.setText(period);
//
//                String replay = episode.getProgramScheduleTime().isAsMainTime() ? "" : context.getString(R.string.label_replay);
//                int _state = episode.getProgramScheduleTime().isAsMainTime() ? View.INVISIBLE : View.VISIBLE;
//                viewHolder.tevEpState.setVisibility(_state);
//                viewHolder.tevEpState.setText(replay);
//
//
//                boolean isNow = episode.getProgramScheduleTime().isWithinRange(episode.getProgramScheduleTime());
//                if (!isNow)
//                    viewHolder.timelineView.setMarker(ContextCompat.getDrawable(context, R.drawable.ic_baseline_adjust_24));
//                else
//                    viewHolder.timelineView.setMarker(ContextCompat.getDrawable(context, R.drawable.ic_baseline_check_circle_24));
//
//            }

//            }

//            // last item
//            if(position==(getItemCount()-1)){
//                viewHolder.timelineView.setEndLineColor(ContextCompat.getColor(context, R.color.transparent),getItemViewType(position));
//            }
//            }
        }
*/

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

//    private class ViewHolder extends RecyclerView.ViewHolder {
//        TimelineView timelineView;
//        ImageView circularImage;
//        TextView tvTitle, tvSubTitle, tevDate, tevTimeShow, tevEpState;
//
//        ViewHolder(View itemView, int viewType) {
//            super(itemView);
//            timelineView = itemView.findViewById(R.id.timeline);
//            circularImage = itemView.findViewById(R.id.circularImage);
//            tvTitle = itemView.findViewById(R.id.tvTitle);
//            tvSubTitle = itemView.findViewById(R.id.tvSubTitle);
//            tevDate = itemView.findViewById(R.id.tevDate);
//            tevTimeShow = itemView.findViewById(R.id.tevTimeShow);
//            tevEpState = itemView.findViewById(R.id.tevEpState);
//
//            timelineView.initLine(viewType);
//        }
//    }

    public static class MyViewHolder extends RecyclerView.ViewHolder {
        private final ItemTimelineBinding binding;

        public MyViewHolder(ItemTimelineBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}


