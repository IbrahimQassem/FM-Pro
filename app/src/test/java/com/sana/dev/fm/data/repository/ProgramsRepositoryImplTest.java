package com.sana.dev.fm.data.repository;

import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.data.datasource.FakeProgramsRemoteDataSource;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.model.RadioProgram;

import org.junit.Before;
import org.junit.Test;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class ProgramsRepositoryImplTest {

    private FakeProgramsRemoteDataSource fakeDataSource;
    private ProgramsRepositoryImpl repository;

    @Before
    public void setUp() {
        fakeDataSource = new FakeProgramsRemoteDataSource();
        repository = new ProgramsRepositoryImpl(fakeDataSource, "TestDb");
    }

    @Test
    public void getProgramsByRadio_success_returnsMappedDomainList() {
        RadioProgram p1 = new RadioProgram();
        p1.setProgramId("p1");
        p1.setRadioId("r1");
        p1.setPrName("Program One");
        p1.setDisabled(false);

        RadioProgram p2 = new RadioProgram();
        p2.setProgramId("p2");
        p2.setRadioId("r1");
        p2.setPrName("Program Two");
        p2.setDisabled(false);

        fakeDataSource.setPrograms(Arrays.asList(p1, p2));

        AtomicReference<Result<List<Program>>> resultRef = new AtomicReference<>();
        repository.getProgramsByRadio("r1", resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isSuccess());
        List<Program> list = resultRef.get().getDataOrNull();
        assertNotNull(list);
        assertEquals(2, list.size());
        assertEquals("p1", list.get(0).getId());
        assertEquals("Program One", list.get(0).getName());
        assertEquals("p2", list.get(1).getId());
    }

    @Test
    public void getProgramsByRadio_emptyStationId_returnsInvalidDataError() {
        AtomicReference<Result<List<Program>>> resultRef = new AtomicReference<>();
        repository.getProgramsByRadio("", resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isFailure());
        assertTrue(resultRef.get().getErrorOrNull() instanceof AppError.InvalidDataError);
    }

    @Test
    public void getProgramsByRadio_networkFailure_returnsNetworkError() {
        fakeDataSource.setException(new IOException("Connection reset by peer"));

        AtomicReference<Result<List<Program>>> resultRef = new AtomicReference<>();
        repository.getProgramsByRadio("r1", resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isFailure());
        assertTrue(resultRef.get().getErrorOrNull() instanceof AppError.NetworkError);
    }

    @Test
    public void getProgramsByRadio_emptyResult_returnsEmptySuccessList() {
        fakeDataSource.setPrograms(Collections.emptyList());

        AtomicReference<Result<List<Program>>> resultRef = new AtomicReference<>();
        repository.getProgramsByRadio("r1", resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isSuccess());
        assertTrue(resultRef.get().getDataOrNull().isEmpty());
    }

    @Test
    public void getProgramById_existingProgram_returnsSuccess() {
        RadioProgram p1 = new RadioProgram();
        p1.setProgramId("prog_100");
        p1.setRadioId("r1");
        p1.setPrName("Special Feature");

        fakeDataSource.setPrograms(Collections.singletonList(p1));

        AtomicReference<Result<Program>> resultRef = new AtomicReference<>();
        repository.getProgramById("r1", "prog_100", resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isSuccess());
        assertEquals("prog_100", resultRef.get().getDataOrNull().getId());
        assertEquals("Special Feature", resultRef.get().getDataOrNull().getName());
    }

    @Test
    public void getProgramById_notFound_returnsNotFoundError() {
        fakeDataSource.setPrograms(Collections.emptyList());

        AtomicReference<Result<Program>> resultRef = new AtomicReference<>();
        repository.getProgramById("r1", "missing_id", resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isFailure());
        assertTrue(resultRef.get().getErrorOrNull() instanceof AppError.NotFoundError);
        assertEquals("missing_id", ((AppError.NotFoundError) resultRef.get().getErrorOrNull()).getResourceId());
    }

    @Test
    public void domainLayer_hasNoFirebaseImports() throws IOException {
        File domainDir = new File("src/main/java/com/sana/dev/fm/domain");
        if (!domainDir.exists()) {
            domainDir = new File("app/src/main/java/com/sana/dev/fm/domain");
        }
        assertTrue("Domain directory should exist", domainDir.exists());

        File[] files = domainDir.listFiles();
        assertNotNull(files);
        assertNoFirebaseImportsRecursive(domainDir);
    }

    private void assertNoFirebaseImportsRecursive(File dir) throws IOException {
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File f : files) {
            if (f.isDirectory()) {
                assertNoFirebaseImportsRecursive(f);
            } else if (f.getName().endsWith(".java")) {
                List<String> lines = Files.readAllLines(f.toPath());
                for (String line : lines) {
                    assertFalse(
                            "Domain file " + f.getName() + " must NOT import Firebase: " + line,
                            line.startsWith("import com.google.firebase")
                    );
                }
            }
        }
    }
}
