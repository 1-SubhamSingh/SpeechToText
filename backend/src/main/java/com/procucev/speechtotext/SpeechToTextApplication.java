package com.procucev.speechtotext;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
public class SpeechToTextApplication {

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(SpeechToTextApplication.class, args);
    }

    private static void loadDotenv() {
        Path[] candidatePaths = new Path[]{
                Path.of(".env"),
                Path.of("../.env")
        };
        for (Path path : candidatePaths) {
            if (Files.exists(path)) {
                try {
                    List<String> lines = Files.readAllLines(path);
                    for (String line : lines) {
                        line = line.trim();
                        if (!line.isEmpty() && !line.startsWith("#") && line.contains("=")) {
                            int idx = line.indexOf('=');
                            String key = line.substring(0, idx).trim();
                            String val = line.substring(idx + 1).trim();
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, val);
                            }
                        }
                    }
                    break;
                } catch (Exception ignored) {
                }
            }
        }
    }
}
