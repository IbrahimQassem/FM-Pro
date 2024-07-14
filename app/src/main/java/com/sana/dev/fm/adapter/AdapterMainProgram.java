package com.sana.dev.fm.adapter;


import static com.sana.dev.fm.utils.FmUtilize.safeList;
import static com.sana.dev.fm.utils.Tools.getFormattedDateOnly;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Typeface;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;

import androidx.annotation.LayoutRes;
import androidx.core.content.ContextCompat;
import androidx.core.content.res.ResourcesCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemProgramsBinding;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.WakeTranslate;
import com.sana.dev.fm.model.enums.Weekday;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.model.interfaces.OnItemLongClick;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.ViewAnimation;
import com.sana.dev.fm.utils.WeekdayUtils;


import java.util.ArrayList;
import java.util.List;

public class AdapterMainProgram extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    private Context ctx;
    private List<RadioProgram> items;
    @LayoutRes
    private int layout_id;
    private OnClickListener mOnItemClickListener;
    private OnItemLongClick mOnLongItemClickListener;

    private int mExpandedPosition = -2;

    public AdapterMainProgram(Context context, List<RadioProgram> list, @LayoutRes int i) {
        this.items = list;
        this.ctx = context;
        this.layout_id = i;
    }

    public void setOnItemClickListener(OnClickListener onItemClickListener) {
        this.mOnItemClickListener = onItemClickListener;
    }

    public void setOnLongItemClickListener(final OnItemLongClick mItemLongClickListener) {
        this.mOnLongItemClickListener = mItemLongClickListener;
    }

    @Override
    public AdapterMainProgram.MyViewHolder onCreateViewHolder(ViewGroup parent, int type) {
        ItemProgramsBinding inflate = ItemProgramsBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
        return new MyViewHolder(inflate);
    }

    public static class MyViewHolder extends RecyclerView.ViewHolder {
        private final ItemProgramsBinding binding;

        public MyViewHolder(ItemProgramsBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }

//    public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup parent, int i) {
//        View view = LayoutInflater.from(ctx).inflate(R.layout.item_programs, parent, false);
//        binding = DataBindingUtil.bind(view);
//        MainViewHolder viewHolder = new ViewHolder(view);
//        return viewHolder;
////        return new MainViewHolder(LayoutInflater.from(view.getContext()).inflate(this.layout_id, viewGroup, false));
//    }


    @Override
    public int getItemCount() {
        return this.items.size();
    }

    @Override
    public void onBindViewHolder(RecyclerView.ViewHolder viewHolder, @SuppressLint("RecyclerView") final int position) {
        if (viewHolder instanceof MyViewHolder) {
            MyViewHolder holder = (MyViewHolder) viewHolder;
            holder.setIsRecyclable(false);

            RadioProgram program = (RadioProgram) this.items.get(position);
            initExpand(holder, program);

            final boolean isExpanded = position == mExpandedPosition;
//            holder.lyt_more.setVisibility(isExpanded?View.VISIBLE:View.GONE);
//            holder.itemView.setActivated(isExpanded);
            if (isExpanded) {
                Tools.toggleArrow(holder.binding.btToggle);

                ViewAnimation.expand(holder.binding.lytMore);
//                ViewAnimation.expand(holder.binding.lytMore, new ViewAnimation.AnimListener() {
//                    public void onFinish() {
////                        Tools.nestedScrollTo(holder.nested_scroll_view, holder.lyt_more);
//                    }
//                });
            } else {
                ViewAnimation.collapse(holder.binding.lytMore);
            }


            Tools.setTextOrHideIfEmpty( holder.binding.title,program.getPrName());

            // Todo
//            originalViewHolder.tvCategory.setText(android.text.TextUtils.join(" , ", program.getPrCategoryList()));
//            originalViewHolder.tag.setText(String.format("@%s", program.getPrTag()));
//            holder.binding.tvTag.setText(program.getPrTag());
            Tools.setTextOrHideIfEmpty( holder.binding.tvTag,null);

            if (!TextUtils.isEmpty(program.getPrDesc())) {
                holder.binding.tvDesc.setText(program.getPrDesc());
            } else {
                holder.binding.lytParentDesc.setVisibility(View.GONE);
            }


            if (program.getProgramScheduleTime() != null) {
                String dt = ctx.getString(R.string.label_date_from_to, getFormattedDateOnly(program.getProgramScheduleTime().getDateStart(), FmUtilize.arabicFormat), getFormattedDateOnly(program.getProgramScheduleTime().getDateEnd(), FmUtilize.arabicFormat));
                holder.binding.tvDayPeriod.setText(dt);
            } else {
                holder.binding.lytParentDayPeriod.setVisibility(View.GONE);
            }

            Tools.displayImageOriginal(this.ctx, holder.binding.ivBanner, program.getPrProfile());
            Tools.displayUserProfile(this.ctx, holder.binding.civLogo,program.getPrProfile(),R.mipmap.ic_launcher_foreground);

            holder.binding.btToggle.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    mExpandedPosition = isExpanded ? -1 : position;
//                    TransitionManager.beginDelayedTransition(holder);
//                    toggleSection(holder.binding.btToggle, holder);
                    Tools.toggleArrow(holder.binding.btToggle);
                    notifyDataSetChanged();
                }
            });

            holder.binding.lytParent.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    if (mOnItemClickListener != null) {
                        mOnItemClickListener.onItemClick(view, (RadioProgram) items.get(position), position);
                    }
                }
            });


            holder.itemView.setOnLongClickListener(new View.OnLongClickListener() {
                @Override
                public boolean onLongClick(View v) {
                    if (mOnLongItemClickListener != null) {
                        mOnLongItemClickListener.onItemLongClick(v, (RadioProgram) items.get(position), position);
                    }
                    return false;
                }
            });
        }
    }

    public void initExpand(MyViewHolder holder, RadioProgram program) {
        if (program.getProgramScheduleTime() != null) {
            DateTimeModel dateTime = program.getProgramScheduleTime();
            List<Weekday> arDayList = safeList(dateTime.getWeekdays());
            for (int i2 = 0; i2 < arDayList.size(); i2++) {
                int pixels = Math.round(Tools.dip2px(ctx, 40));

                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        pixels);

                Button btn = new Button(ctx);
                btn.setId(i2);

                String dayName =  WeekdayUtils.getLocalizedDayName(arDayList.get(i2),"ar");
                btn.setText(dayName);
                final int sdk = android.os.Build.VERSION.SDK_INT;
                if (sdk < android.os.Build.VERSION_CODES.JELLY_BEAN) {
                    btn.setBackgroundDrawable(ContextCompat.getDrawable(ctx, R.drawable.btn_rounded_darker));
                } else {
                    btn.setBackground(ContextCompat.getDrawable(ctx, R.drawable.btn_rounded_darker));
                }
                btn.setTextColor(ctx.getResources().getColor(R.color.grey_60));
                Typeface typeface = ResourcesCompat.getFont(ctx, R.font.tj_regular);
                btn.setTypeface(typeface);
                holder.binding.flexDayShow.addView(btn, params);
            }
        } else {
            holder.binding.lytParentShowDays.setVisibility(View.GONE);
        }

        if (program.getPrCategoryList() != null) {
            int index = 0;
            for (Object o : safeList(program.getPrCategoryList())) {
                // do whatever
                int pixels = Math.round(Tools.dip2px(ctx, 40));

                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        pixels);

                Button btn = new Button(ctx);
                btn.setId(index);
                index++;
                btn.setText(o.toString());
                final int sdk = android.os.Build.VERSION.SDK_INT;
                if (sdk < android.os.Build.VERSION_CODES.JELLY_BEAN) {
                    btn.setBackgroundDrawable(ContextCompat.getDrawable(ctx, R.drawable.btn_rounded_darker));
                } else {
                    btn.setBackground(ContextCompat.getDrawable(ctx, R.drawable.btn_rounded_darker));
                }
                btn.setTextColor(ctx.getResources().getColor(R.color.grey_60));
                Typeface typeface = ResourcesCompat.getFont(ctx, R.font.tj_regular);
                btn.setTypeface(typeface);
                holder.binding.flexCategory.addView(btn, params);
            }
        } else {
            holder.binding.lytParentCategory.setVisibility(View.GONE);
        }
        
    }
    
    public void removeAt(int position) {
        items.remove(position);
        notifyItemRemoved(position);
//        notifyItemRangeChanged(position, items.size());
    }

}
