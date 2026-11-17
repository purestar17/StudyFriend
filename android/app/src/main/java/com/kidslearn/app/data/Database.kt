package com.kidslearn.app.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "sessions")
data class StudySession(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val subject: String,
    val level: Int,
    val total: Int,
    val correct: Int,
    val startedAt: Long,
    val durationSec: Int,
    /** 틀린 문제 요약 (줄바꿈 구분) */
    val wrongItems: String = "",
)

@Dao
interface SessionDao {
    @Insert
    suspend fun insert(session: StudySession): Long

    @Query("SELECT * FROM sessions ORDER BY startedAt DESC LIMIT 200")
    fun recent(): Flow<List<StudySession>>

    @Query("SELECT * FROM sessions WHERE startedAt >= :since ORDER BY startedAt DESC")
    fun since(since: Long): Flow<List<StudySession>>
}

@Database(entities = [StudySession::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun sessions(): SessionDao

    companion object {
        @Volatile private var instance: AppDatabase? = null
        fun get(context: Context): AppDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, AppDatabase::class.java, "kids.db")
                .build().also { instance = it }
        }
    }
}
