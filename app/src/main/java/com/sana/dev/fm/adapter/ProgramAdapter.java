package com.sana.dev.fm.adapter;

import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.databinding.ItemProgramsBinding;
import com.sana.dev.fm.model.RadioProgram;

import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Locale;

public class ProgramAdapter extends RecyclerView.Adapter<ProgramAdapter.MyViewHolder> {
    private List<RadioProgram> programs;
    private final OnProgramClickListener listener;

    public interface OnProgramClickListener {
        void onProgramClick(RadioProgram program);
    }

    public ProgramAdapter(List<RadioProgram> programs, OnProgramClickListener listener) {
        this.programs = programs;
        this.listener = listener;
    }

    @Override
    public ProgramAdapter.MyViewHolder onCreateViewHolder(ViewGroup parent, int type) {
        ItemProgramsBinding inflate = ItemProgramsBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
        return new ProgramAdapter.MyViewHolder(inflate);
    }

    public static class MyViewHolder extends RecyclerView.ViewHolder {
        private final ItemProgramsBinding binding;

        public MyViewHolder(ItemProgramsBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }

    @Override
    public void onBindViewHolder(@NonNull MyViewHolder viewHolder, int position) {
        if (viewHolder instanceof MyViewHolder) {
            MyViewHolder holder = (MyViewHolder) viewHolder;
            holder.setIsRecyclable(false);

            RadioProgram program = programs.get(position);


            holder.binding.title.setText(program.getPrName());
            holder.binding.tvDesc.setText(program.getPrDesc());

            SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.getDefault());
            String dateRange = dateFormat.format(program.getProgramScheduleTime().getDateStart()) + " - " +
                    dateFormat.format(program.getProgramScheduleTime().getDateEnd());
            holder.binding.tvDayPeriod.setText(dateRange);

//            statusIcon.setImageResource(program.isActive() ?
//                    R.drawable.ic_active : R.drawable.ic_inactive);

            holder.itemView.setOnClickListener(v -> listener.onProgramClick(program));
        }
    }

    @Override
    public int getItemCount() {
        return programs.size();
    }

    public void updatePrograms(List<RadioProgram> newPrograms) {
        this.programs = newPrograms;
        notifyDataSetChanged();
    }

}